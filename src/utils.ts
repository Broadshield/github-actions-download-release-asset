import * as core from '@actions/core'
import { Context } from '@actions/github/lib/context'
import { GitHub } from '@actions/github/lib/utils'
import { Octokit } from '@octokit/rest'
import fs from 'fs'
import * as path from 'path'

import { Release, ReleaseAsset, Repo } from './types'

export function repoSplit(
  inputRepo: string | undefined | null,
  context: Context | undefined | null,
): Repo | null {
  const result = ({} as unknown) as Repo
  if (inputRepo) {
    ;[result.owner, result.repo] = inputRepo.split('/')

    core.debug(`repoSplit passed ${inputRepo} and returns ${JSON.stringify(result)}`)
    return result
  } else if (process.env.GITHUB_REPOSITORY) {
    ;[result.owner, result.repo] = process.env.GITHUB_REPOSITORY.split('/')
    core.debug(
      `repoSplit using GITHUB_REPOSITORY ${
        process.env.GITHUB_REPOSITORY
      } and returns ${JSON.stringify(result)}`,
    )
    return result
  } else if (context) {
    result.owner = context.repo.owner
    result.repo = context.repo.repo

    core.debug(
      `repoSplit using GITHUB_REPOSITORY ${
        process.env.GITHUB_REPOSITORY
      } and returns ${JSON.stringify(result)}`,
    )
    return result
  }
  throw Error("repoSplit requires a GITHUB_REPOSITORY environment variable like 'owner/repo'")
}
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}

export async function getReleaseByTag(
  owner: string,
  repo: string,
  tagName: string,
  octokit: InstanceType<typeof GitHub>,
  ignore_v_when_searching = true,
): Promise<Release | undefined> {
  const pages = {
    owner,
    repo,
    per_page: 100,
  }

  let search_str

  if (ignore_v_when_searching) {
    search_str = `^(v)?${escapeRegExp(tagName)}`
  } else {
    search_str = `^${tagName}`
  }
  const search_re = RegExp(search_str)
  const releases = await octokit.paginate(
    octokit.rest.repos.listReleases,
    pages,
    (response: any, done) => {
      if (response.data.find((item: any) => item.tag_name.match(search_re))) {
        if (done !== undefined) {
          done()
        }
      }
      return response.data
    },
  )
  const r = releases.find((item: any) => item.tag_name.match(search_re))

  if (r === undefined) {
    core.setFailed(`getReleaseByTag found no releases matching ${tagName}`)
  }
  core.debug(`getReleaseByTag returns ${JSON.stringify(r?.name, null, ' ')}`)
  return r
}

export const checker = (arr: string[], target: string[]): boolean => {
  return target.every(v => arr.includes(v))
}

export async function downloadReleaseAssets(
  release: Release | undefined,
  asset_names: string[],
  filepath: string,
  repos: Repo,
  token: string,
  octokitInstance: InstanceType<typeof GitHub> | InstanceType<typeof Octokit> | undefined,
): Promise<void> {
  let octokit: InstanceType<typeof GitHub> | InstanceType<typeof Octokit>
  if (octokitInstance === undefined) {
    octokit = new Octokit({ auth: token })
    octokit.rest.repos.getReleaseAsset.endpoint.merge({
      headers: {
        Accept: 'application/octet-stream',
        UserAgent: 'download-release-assets',
        //Host: "api.github.com"
        // Authorization: `token ${token}`,
      },
      // access_token: token,
    })
  } else {
    octokit = octokitInstance
  }
  let download_assets: string[]
  if (release !== undefined) {
    const release_assets: ReleaseAsset[] = release?.assets
    const release_asset_names = release_assets.map(a => a.name)
    if (release_assets.length > 0) {
      if (asset_names) {
        if (!checker(asset_names, release_asset_names)) {
          core.warning(
            `The release contains these assets ${JSON.stringify(
              release_asset_names,
            )} but you requested ${JSON.stringify(asset_names)}`,
          )
        }
        download_assets = asset_names.filter(an => {
          return release_asset_names.includes(an)
        })
      } else {
        download_assets = release_asset_names
      }
      const downloaded_paths: string[] = []
      for (const a of release_assets) {
        if (download_assets.includes(a.name.trim())) {
          if (!fs.existsSync(filepath)) {
            fs.mkdirSync(filepath)
          }
          const outFilePath: string = path.resolve(filepath, a.name)
          downloaded_paths.push(outFilePath)
          const fileStream = fs.createWriteStream(outFilePath, { flags: 'a' })

          const downloadInfo = await octokit.request(
            'GET /repos/{owner}/{repo}/releases/assets/{asset_id}',
            {
              ...repos,
              asset_id: a.id,
            },
          )
          // Redirect URLs now contain the auth key, redirect without the auth header
          if (downloadInfo?.headers?.location !== undefined) {
            const asset = await octokit.request(`GET ${downloadInfo.headers.location}`, {
              headers: {
                Accept: 'application/octet-stream',
                UserAgent: 'download-release-assets',
              },
            })
            fileStream.write(Buffer.from(asset.data))
            fileStream.end()
          }
        }
      }
      core.setOutput('downloaded_paths', JSON.stringify(downloaded_paths))
    }
    core.setOutput('release_id', release.id)
    core.setOutput('release_name', release.name)
    core.setOutput('release_tag_name', release.tag_name)
    core.setOutput('release_body', release?.body)
    core.setOutput('release_assets_found', release_assets?.join(','))
  }
}
