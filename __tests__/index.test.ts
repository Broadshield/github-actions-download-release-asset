import {app_version as maven_app_version} from '../src/appVersionMaven'
import {app_version as gradle_app_version} from '../src/appVersionGradle'
import {Repo, VersionObject} from '../src/interfaces'
import {VersionObjectBuilder} from '../src/versionObjectBuilder'
import {Context} from '@actions/github/lib/context'

import {
  stripRefs,
  repoSplit,
  normalize_version,
  getVersionStringPrefix,
  basename,
  parseVersionString,
  getLatestTag,
  bumper
} from '../src/utils'

describe('Get Versions', () => {
  let version1 = new VersionObjectBuilder().major(2).minor(3).patch(1).build()

  let version2 = new VersionObjectBuilder()
    .major(2)
    .minor(3)
    .patch(1)
    .with_v('v')
    .build()

  let version3 = new VersionObjectBuilder()
    .major(2)
    .minor(3)
    .patch(1)
    .with_v('v')
    .label_prefix('-')
    .label('PR1234')
    .buildNum(1)
    .build()

  let version4 = new VersionObjectBuilder()
    .major(2)
    .minor(3)
    .patch(1)
    .with_v('v')
    .label_prefix('-')
    .label('PR1234')
    .buildNum(45)
    .build()

  test('version from tests/pom.xml to equal 1.0.0', () => {
    expect(maven_app_version('./__tests__/tests/pom.xml')).toBe('1.0.0')
  })

  test('version from tests/build.gradle to equal 1.0.0', () => {
    expect(gradle_app_version('./__tests__/tests/build.gradle')).toBe(
      '1.0.0-SNAPSHOT'
    )
  })

  test(`parseVersionString given string 2.3.1 should match ${JSON.stringify(
    version1
  )}`, () => {
    expect(parseVersionString('2.3.1')).toStrictEqual(version1)
  })
  test(`parseVersionString given string v2.3.1 should match ${JSON.stringify(
    version2
  )}`, () => {
    expect(parseVersionString('v2.3.1')).toStrictEqual(version2)
  })
  test(`parseVersionString given string v2.3.1-PR1234.1 should match ${JSON.stringify(
    version3
  )}`, () => {
    expect(parseVersionString('v2.3.1-PR1234.1')).toStrictEqual(version3)
  })

  test(`parseVersionString given string v2.3.1-PR1234.45 should match ${JSON.stringify(
    version4
  )}`, () => {
    expect(parseVersionString('v2.3.1-PR1234.45')).toStrictEqual(version4)
  })
})

describe('normalize utility', () => {
  test('takes string "1.0.0-SNAPSHOT" and returns 1.0.0', () => {
    expect(normalize_version('1.0.0-SNAPSHOT')).toBe('1.0.0')
  })

  test('takes string "1.0.1-PR123.1" and returns 1.0.1', () => {
    expect(normalize_version('1.0.1-PR123.1')).toBe('1.0.1')
  })

  test('takes string "" and returns the default value 0.0.1', () => {
    expect(normalize_version('', '0.0.1')).toBe('0.0.1')
  })
})

describe('basename utility', () => {
  test('takes string "refs/tags/1.2.3" and returns 1.2.3', () => {
    expect(basename('refs/tags/1.2.3')).toBe('1.2.3')
  })
})

describe('stripRefs utility', () => {
  test('take refs/tags/1.2.3 and returns 1.2.3', () => {
    expect(stripRefs('refs/tags/1.2.3')).toBe('1.2.3')
  })

  test('take refs/heads/feature/UNICORN-1234-new-thing and returns feature/UNICORN-1234-new-thing', () => {
    expect(stripRefs('refs/heads/feature/UNICORN-1234-new-thing')).toBe(
      'feature/UNICORN-1234-new-thing'
    )
  })
})

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
