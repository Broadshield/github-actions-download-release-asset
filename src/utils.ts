import * as fs from 'node:fs';
import { WriteStream } from 'node:fs';
import path from 'node:path';

import * as core from '@actions/core';
import { Context } from '@actions/github/lib/context';
import { GitHub } from '@actions/github/lib/utils';
import { RequestError } from '@octokit/request-error';
import { Octokit } from '@octokit/rest';

import { Release, ReleaseAsset, Repo } from './types';

export function repoSplit(inputRepo: string | undefined | null, context: Context | undefined | null): Repo | null {
  const result: { owner?: string; repo?: string } = {};
  if (inputRepo) {
    [result.owner, result.repo] = inputRepo.split('/');

    core.debug(`repoSplit passed ${inputRepo} and returns ${JSON.stringify(result)}`);
    return result as Repo;
  }
  if (process.env.GITHUB_REPOSITORY) {
    [result.owner, result.repo] = process.env.GITHUB_REPOSITORY.split('/');
    core.debug(
      `repoSplit using GITHUB_REPOSITORY ${process.env.GITHUB_REPOSITORY} and returns ${JSON.stringify(result)}`,
    );
    return result as Repo;
  }
  if (context) {
    result.owner = context.repo.owner;
    result.repo = context.repo.repo;

    core.debug(
      `repoSplit using GITHUB_REPOSITORY ${process.env.GITHUB_REPOSITORY} and returns ${JSON.stringify(result)}`,
    );
    return result as Repo;
  }
  throw new Error('repoSplit requires a GITHUB_REPOSITORY environment variable like "owner/repo"');
}
// function escapeRegExp(str: string): string {
//   return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
// }

export async function getReleaseByTag(
  owner: string,
  repo: string,
  tagName: string,
  token: string,
  octokitInstance: InstanceType<typeof GitHub> | InstanceType<typeof Octokit> | undefined,
  ignore_v_when_searching = true,
): Promise<Release | undefined> {
  const octokit: InstanceType<typeof GitHub> | InstanceType<typeof Octokit> =
    octokitInstance === undefined ? new Octokit({ auth: token }) : octokitInstance;
  if (ignore_v_when_searching) {
    let resp = await octokit.rest.repos.getReleaseByTag({
      owner,
      repo,
      tag: tagName,
    });
    if (resp.status === 200) {
      return resp.data;
    }
    resp = await octokit.rest.repos.getReleaseByTag({
      owner,
      repo,
      tag: `v${tagName}`,
    });
    if (resp.status === 200) {
      return resp.data;
    }
    return undefined;
  }
  const resp = await octokit.rest.repos.getReleaseByTag({
    owner,
    repo,
    tag: tagName,
  });
  return resp.data;
}

export const checker = (arr: string[], target: string[]): boolean => {
  return target.every((v) => arr.includes(v));
};

export async function downloadReleaseAssets(
  release: Release | undefined,
  asset_names: string[],
  filepath: string,
  repos: Repo,
  token: string,
  octokitInstance?: InstanceType<typeof GitHub> | InstanceType<typeof Octokit>,
  do_not_error_if_missing = false,
): Promise<void> {
  const octokit: InstanceType<typeof GitHub> | InstanceType<typeof Octokit> =
    octokitInstance === undefined ? new Octokit({ auth: token }) : octokitInstance;
  octokit.log.debug(`Octokit auth: ${octokit.auth()}`);
  let download_assets: string[];
  if (release !== undefined) {
    const releaseAssets: ReleaseAsset[] = [...release.assets];
    const release_asset_names = releaseAssets.map((a) => a.name);
    if (releaseAssets.length > 0) {
      if (asset_names) {
        if (!checker(asset_names, release_asset_names)) {
          const not_found_msg = `The release contains these assets ${JSON.stringify(
            release_asset_names,
          )} but you requested ${JSON.stringify(asset_names)}`;
          if (!do_not_error_if_missing) {
            core.warning(not_found_msg);
          } else {
            core.info(not_found_msg);
          }
        }
        download_assets = asset_names.filter((an) => {
          return release_asset_names.includes(an);
        });
      } else {
        download_assets = release_asset_names;
      }
      const downloaded_paths: string[] = [];
      const download_promises: Promise<WriteStream>[] = [];
      for (const a of releaseAssets) {
        if (download_assets.includes(a.name.trim())) {
          if (!fs.existsSync(filepath)) {
            fs.mkdirSync(filepath);
          }
          const outFilePath: string = path.resolve(filepath, a.name);
          downloaded_paths.push(outFilePath);
          const fileStream = fs.createWriteStream(outFilePath, { flags: 'a' });

          const rq = {
            headers: {
              accept: 'application/octet-stream',
            },
          };
          download_promises.push(
            octokit.rest.repos
              .getReleaseAsset({
                ...rq,
                ...repos,
                asset_id: a.id,
              })
              .then((response) => {
                octokit.log.debug(`downloadReleaseAssets response ${JSON.stringify(response.data, null, ' ')}`);
                fileStream.write(Buffer.from(response.data as unknown as ArrayBuffer), 'binary');
                return fileStream.end();
              })
              .catch(async (error_) => {
                const error = error_ as RequestError;
                if (
                  error !== undefined &&
                  'status' in error &&
                  error.status === 400 &&
                  error.response !== undefined &&
                  error.response.url.includes('/objects.githubusercontent.com/')
                ) {
                  const ok = new Octokit();
                  return ok.request(`GET ${error.response.url}`).then((response) => {
                    fileStream.write(Buffer.from(response.data as unknown as ArrayBuffer), 'binary');
                    return fileStream.end();
                  });
                }
                const errorMsg = `Error downloading asset ${a.name}: \n${JSON.stringify(error_)}`;
                core.setFailed(errorMsg);
                throw error_;
              }),
          );

          // fileStream.write(Buffer.from(asset.data));
          // fileStream.end();
          // const downloadInfo = await octokit.request(
          //     'GET /repos/{owner}/{repo}/releases/assets/{asset_id}',
          //     {
          //         ...repos,
          //         asset_id: a.id,
          //     },
          // );
          // // Redirect URLs now contain the auth key, redirect without the auth header
          // if (downloadInfo?.headers?.location !== undefined) {
          //     const ok = new Octokit();
          //     const redirectUrl = downloadInfo.headers.location;
          //     const thisurl = new url.URL(redirectUrl);
          //     core.debug(`URL parameters are ${thisurl.searchParams}`);
          //     thisurl.searchParams.delete('access_token');
          //     core.debug(`Redirecting to ${url.toString()}`);

          //     const asset = await ok.request(`GET ${url.toString()}`, {
          //         headers: {
          //             Accept: 'application/octet-stream',
          //             UserAgent: 'download-release-assets',
          //         },
          //     });
          //     fileStream.write(Buffer.from(asset.data));
          //     fileStream.end();
          // } else {
          //     throw new Error('Redirect URL not found');
          // }
        }
      }
      await Promise.all(download_promises);
      core.setOutput('downloaded_paths', JSON.stringify(downloaded_paths));
    }
  }
}
