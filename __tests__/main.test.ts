import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { assert } from 'console';
import { resolve } from 'path';

import fsHelper from '../src/fs-helper';
import { Repo } from '../src/types';
import { downloadReleaseAssets, getReleaseByTag, repoSplit } from '../src/utils';

jest.setTimeout(360000);

interface Inputs {
    [key: string]: string;
}

describe('get releases', () => {
    const originalGitHubWorkspace = process.env.GITHUB_WORKSPACE;
    const gitHubWorkspace = resolve('/checkout-tests/workspace');

    // Inputs for mock @actions/core
    let inputs: Inputs = {};
    // Shallow clone original @actions/github context
    const originalContext = { ...context };
    beforeAll(() => {
        // Mock getInput
        jest.spyOn(core, 'getInput').mockImplementation((name: string) => {
            return inputs[name];
        });
        // Mock error/warning/info/debug
        jest.spyOn(core, 'error').mockImplementation(console.log);
        jest.spyOn(core, 'warning').mockImplementation(console.log);
        jest.spyOn(core, 'info').mockImplementation(console.log);
        jest.spyOn(core, 'debug').mockImplementation(console.log);

        // Mock github context
        jest.spyOn(context, 'repo', 'get').mockImplementation(() => {
            return {
                owner: 'Broadshield',
                repo: 'some-repo',
            };
        });
        context.ref = 'refs/heads/some-ref';
        context.sha = '1234567890123456789012345678901234567890';

        // Mock ./fs-helper directoryExistsSync()
        jest.spyOn(fsHelper, 'directoryExistsSync').mockImplementation(
            (fspath: string) => fspath === gitHubWorkspace,
        );

        // GitHub workspace
        process.env.GITHUB_WORKSPACE = gitHubWorkspace;
    });
    beforeEach(() => {
        // Reset inputs
        inputs = {};

        inputs.github_token = process.env.GITHUB_TOKEN || '';
        inputs.tag_name = 'v2.19.0+31';
        inputs.ignore_v_when_searching = 'true';
        inputs.asset_names = 'ROOT.war';
        inputs.filepath = process.cwd();
    });
    afterAll(() => {
        // Restore GitHub workspace
        delete process.env.GITHUB_WORKSPACE;
        if (originalGitHubWorkspace) {
            process.env.GITHUB_WORKSPACE = originalGitHubWorkspace;
        }

        // Restore @actions/github context
        context.ref = originalContext.ref;
        context.sha = originalContext.sha;

        // Restore
        jest.restoreAllMocks();
    });

    it('Get Known Asset', async () => {
        assert(process.env.GITHUB_TOKEN, 'GITHUB_TOKEN environment variable does not exist');

        const octokit = getOctokit(inputs.github_token || process.env.GITHUB_TOKEN || '');
        const repos = repoSplit('Broadshield/wearsafe-api', null);

        if (inputs.github_token == null || repos == null) {
            throw new Error('token or repos not provided');
        }
        const release = await getReleaseByTag(
            repos.owner,
            repos.repo,
            inputs.tag_name,
            octokit,
            inputs.ignore_v_when_searching === 'true',
        );
        core.info(JSON.stringify(release));

        await downloadReleaseAssets(
            release,
            inputs.asset_names?.split(','),
            inputs.filepath,
            repos,
            inputs.github_token,
            undefined,
        );
    });
});

describe('repoSplit utility', () => {
    const originalEnvironment = { ...process.env };
    const result: Repo = {
        owner: 'Broadshield',
        repo: 'api',
    };
    beforeAll(() => {
        process.env['GITHUB_REPOSITORY'] = 'Broadshield/api';
        // Mock github context
        jest.spyOn(context, 'repo', 'get').mockImplementation(() => {
            return {
                owner: 'Broadshield',
                repo: 'api',
            };
        });

        context.ref = 'refs/heads/some-ref';
        context.sha = '1234567890123456789012345678901234567890';
    });

    beforeEach(() => {
        jest.resetModules(); // most important - it clears the cache
    });

    afterAll(() => {
        delete process.env['GITHUB_REPOSITORY'];
        process.env = originalEnvironment; // restore old env
    });

    test(`take string 'Broadshield/api' and returns object ${JSON.stringify(result)}`, () => {
        expect(repoSplit('Broadshield/api', context)).toStrictEqual(result);
    });

    test(`take null, has environment variable GITHUB_REPOSITORY available and returns object ${JSON.stringify(
        result,
    )}`, () => {
        expect(repoSplit(null, context)).toStrictEqual(result);
    });

    test(`take null, has context available and returns object ${JSON.stringify(result)}`, () => {
        delete process.env['GITHUB_REPOSITORY'];

        expect(repoSplit(null, context)).toStrictEqual(result);
    });
});
