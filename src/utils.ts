import {Context} from '@actions/github/lib/context'
import {Repo, Release, ReleaseAsset} from './interfaces'
import * as core from '@actions/core'
import {GitHub} from '@actions/github/lib/utils'
import fs from 'fs'
import * as path from 'path'

export function repoSplit(
  inputRepo: string | undefined | null,
  context: Context
): Repo | null {
  if (inputRepo) {
    const [owner, repo] = inputRepo.split('/')
    const result = {owner, repo}
    core.debug(
      `repoSplit passed ${inputRepo} and returns ${JSON.stringify(result)}`
    )
    return result
  }
  if (process.env.GITHUB_REPOSITORY) {
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/')
    const result = {owner, repo}
    core.debug(
      `repoSplit using GITHUB_REPOSITORY ${
        process.env.GITHUB_REPOSITORY
      } and returns ${JSON.stringify(result)}`
    )
    return result
  }

  if (context.payload.repository) {
    const result = {
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name
    }
    core.debug(
      `repoSplit using GITHUB_REPOSITORY ${
        process.env.GITHUB_REPOSITORY
      } and returns ${JSON.stringify(result)}`
    )
    return result
  }
  throw Error(
    "repoSplit requires a GITHUB_REPOSITORY environment variable like 'owner/repo'"
  )
}
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}

export async function getReleaseByTag(
  owner: string,
  repo: string,
  tagName: string,
  octokit: InstanceType<typeof GitHub>,
  ignore_v_when_searching = true
): Promise<Release | undefined> {
  const pages = {
    owner,
    repo,
    per_page: 100
  }

  let search_str

  if (ignore_v_when_searching) {
    search_str = `^(v)?${escapeRegExp(tagName)}`
  } else {
    search_str = `^${tagName}`
  }
  const search_re = RegExp(search_str)
  const releases = await octokit.paginate(
    octokit.repos.listReleases,
    pages,
    (response, done) => {
      if (response.data.find(item => item.tag_name.match(search_re))) {
        if (done !== undefined) {
          done()
        }
      }
      return response.data
    }
  )
  const r = releases.find(item => item.tag_name.match(search_re))

  if (r === undefined) {
    core.setFailed(`getReleaseByTag found no releases matching ${tagName}`)
  }
  core.debug(`getLatestTag returns ${JSON.stringify(r)}`)
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
  octokit: InstanceType<typeof GitHub>
): Promise<void> {
  let download_assets: string[]
  if (release !== undefined) {
    const release_assets: ReleaseAsset[] = release?.assets
    const release_asset_names = release_assets.map(a => a.name)
    if (release_assets.length > 0) {
      if (asset_names) {
        if (checker(asset_names, release_asset_names)) {
          core.warning(
            `The release contains these assets ${JSON.stringify(
              release_asset_names
            )} but you requested ${JSON.stringify(asset_names)}`
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
          const fileStream = fs.createWriteStream(outFilePath)
          const fBuffer = await octokit.repos.getReleaseAsset({
            ...repos,
            asset_id: a.id
          })
          fileStream.write(fBuffer.data)
          fileStream.end()
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
