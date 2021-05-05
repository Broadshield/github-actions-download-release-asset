import * as core from '@actions/core'
import * as github from '@actions/github'
import { assert } from 'console'
import * as path from 'path'

import * as fsHelper from '../src/fs-helper'
import { Repo } from '../src/interfaces'
import { downloadReleaseAssets, getReleaseByTag, repoSplit } from '../src/utils'

const originalGitHubWorkspace = process.env.GITHUB_WORKSPACE
const gitHubWorkspace = path.resolve('/checkout-tests/workspace')

export const issue = 'DVPS-336'
export const baseUrl = process.env.JIRA_BASE_URL as string
jest.setTimeout(360000)
const result: Repo = {
  owner: 'Broadshield',
  repo: 'api',
}
// Inputs for mock @actions/core
let inputs = {} as any
// Shallow clone original @actions/github context
const originalContext = { ...github.context }
const originalEnvironment = { ...process.env }

describe('get releases', () => {
  beforeAll(() => {

    // Mock getInput
    jest.spyOn(core, 'getInput').mockImplementation((name: string) => {
      return inputs[name]
    })
    // Mock error/warning/info/debug
    jest.spyOn(core, 'error').mockImplementation(console.log)
    jest.spyOn(core, 'warning').mockImplementation(console.log)
    jest.spyOn(core, 'info').mockImplementation(console.log)
    jest.spyOn(core, 'debug').mockImplementation(console.log)

    // Mock github context
    jest.spyOn(github.context, 'repo', 'get').mockImplementation(() => {
      return {
        owner: 'Broadshield',
        repo: 'some-repo',
      }
    })
    github.context.ref = 'refs/heads/some-ref'
    github.context.sha = '1234567890123456789012345678901234567890'

    // Mock ./fs-helper directoryExistsSync()
    jest
      .spyOn(fsHelper, 'directoryExistsSync')
      .mockImplementation((fspath: string) => fspath === gitHubWorkspace)

    // GitHub workspace
    process.env.GITHUB_WORKSPACE = gitHubWorkspace
  })
  beforeEach(() => {
    // Reset inputs
    inputs = {}

    inputs.github_token = process.env.GITHUB_TOKEN || ''
    inputs.tag_name = 'v2.19.0+31'
    inputs.ignore_v_when_searching = true
    inputs.asset_names = ['ROOT.war']
    inputs.filepath = process.cwd()
  })
  afterAll(() => {
    // Restore GitHub workspace
    delete process.env.GITHUB_WORKSPACE
    if (originalGitHubWorkspace) {
      process.env.GITHUB_WORKSPACE = originalGitHubWorkspace
    }

    // Restore @actions/github context
    github.context.ref = originalContext.ref
    github.context.sha = originalContext.sha

    // Restore
    jest.restoreAllMocks()
  })

  it('Get Known Asset', async () => {
    assert(process.env.GITHUB_TOKEN, "Token doesn't exist")

    const octokit = github.getOctokit(inputs.github_token)
    const repos = repoSplit('Broadshield/wearsafe-api', null)

    if (inputs.github_token == null || repos == null) {
      throw new Error('token or repos not provided')
    }
    const release = await getReleaseByTag(
      repos.owner,
      repos.repo,
      inputs.tag_name,
      octokit,
      inputs.ignore_v_when_searching,
    )
    core.info(JSON.stringify(release))

    await downloadReleaseAssets(
      release,
      inputs.asset_names,
      inputs.filepath,
      repos,
      inputs.github_token,
      undefined,
    )
  })
})

describe('repoSplit utility', () => {
  beforeAll(() => {
    process.env['GITHUB_REPOSITORY'] = 'Broadshield/api'
    // Mock github context
    jest.spyOn(github.context, 'repo', 'get').mockImplementation(() => {
      return {
        owner: 'Broadshield',
        repo: 'api',
      }
    })

    github.context.ref = 'refs/heads/some-ref'
    github.context.sha = '1234567890123456789012345678901234567890'
  })

  beforeEach(() => {
    jest.resetModules() // most important - it clears the cache
  })

  afterAll(() => {
    delete process.env['GITHUB_REPOSITORY']
    process.env = originalEnvironment // restore old env
  })

  test(`take string 'Broadshield/api' and returns object ${JSON.stringify(result)}`, () => {
    expect(repoSplit('Broadshield/api', github.context)).toStrictEqual(result)
  })

  test(`take null, has environment variable GITHUB_REPOSITORY available and returns object ${JSON.stringify(
    result,
  )}`, () => {
    expect(repoSplit(null, github.context)).toStrictEqual(result)
  })

  test(`take null, has context available and returns object ${JSON.stringify(result)}`, () => {
    delete process.env['GITHUB_REPOSITORY']

    expect(repoSplit(null, github.context)).toStrictEqual(result)
  })
})
