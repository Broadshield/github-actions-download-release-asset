import * as core from '@actions/core'
import * as github from '@actions/github'
import {repoSplit, getReleaseByTag, downloadReleaseAssets} from './utils'
import {Repo} from './interfaces'

async function run(): Promise<void> {
  try {
    const {context} = github
    const github_token =
      core.getInput('github_token', {required: false}) ||
      process.env.GITHUB_TOKEN ||
      null
    const tag_name = core.getInput('tag_name', {required: false}) || 'latest'
    const asset_names = core
      .getInput('asset_names', {required: false})
      ?.split(',')
    const filepath =
      core.getInput('path', {required: false}) ||
      process.env.GITHUB_WORKSPACE ||
      process.cwd()
    core.setOutput('path', filepath)
    const repository =
      core.getInput('repository', {required: false}) ||
      process.env.GITHUB_REPOSITORY ||
      null
    const ignore_v_when_searching =
      core.getInput('ignore_v_when_searching', {
        required: false
      }) === 'true'

    core.debug('Loading octokit: started')
    let octokit
    if (!github_token) {
      core.setFailed('github_token not supplied')
      return
    } else {
      octokit = github.getOctokit(github_token)
    }

    core.debug('Loading octokit: completed')

    let repos: null | Repo = null

    try {
      repos = repoSplit(repository, context)
    } catch (e) {
      core.setFailed(`Action failed with error: ${e}`)
    }

    if (!repos) {
      core.setFailed(
        `Action failed with error: No repository information available`
      )
      return
    }

    const release = await getReleaseByTag(
      repos.owner,
      repos.repo,
      tag_name,
      octokit,
      ignore_v_when_searching
    )

    await downloadReleaseAssets(release, asset_names, filepath, repos, octokit)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
