import {Repo} from '../src/interfaces'
import {Context} from '@actions/github/lib/context'

import {repoSplit, downloadReleaseAssets, getReleaseByTag} from '../src/utils'

describe('repoSplit utility', () => {
  const OLD_ENV = process.env
  const repository = 'Broadshield/api'
  const result: Repo = {
    owner: 'Broadshield',
    repo: 'api'
  }
  const context: Context = {
    eventName: 'push',
    ref: '/refs/tags/1.0.0',
    actor: 'jamie-github',
    sha: 'abc123',
    workflow: 'test',
    action: 'tag-name-from-gradle-or-maven',
    job: 'unit-tests',
    runNumber: 1,
    runId: 1,
    issue: {
      repo: 'api',
      owner: 'Broadshield',
      number: 1
    },
    repo: {
      repo: 'api',
      owner: 'Broadshield'
    },
    payload: {
      repository: {
        owner: {
          login: 'Broadshield'
        },
        name: 'api'
      }
    }
  }

  beforeEach(() => {
    jest.resetModules() // most important - it clears the cache
    process.env = {...OLD_ENV} // make a copy
  })

  afterAll(() => {
    process.env = OLD_ENV // restore old env
  })

  test(`take string 'Broadshield/api' and returns object ${JSON.stringify(
    result
  )}`, () => {
    expect(repoSplit(repository, context)).toStrictEqual(result)
  })

  test(`take null, has environment variable GITHUB_REPOSITORY available and returns object ${JSON.stringify(
    result
  )}`, () => {
    process.env.GITHUB_REPOSITORY = repository
    expect(repoSplit(null, context)).toStrictEqual(result)
  })

  test(`take null, has context available and returns object ${JSON.stringify(
    result
  )}`, () => {
    delete process.env.GITHUB_REPOSITORY

    expect(repoSplit(null, context)).toStrictEqual(result)
  })
})
