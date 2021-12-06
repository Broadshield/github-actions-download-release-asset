import { debug, getInput, setFailed, setOutput } from '@actions/core';
import * as github from '@actions/github';

import { Repo } from './types';
import { downloadReleaseAssets, getReleaseByTag, repoSplit } from './utils';

(async function (): Promise<void> {
    try {
        const { context } = github;
        const github_token =
            getInput('github_token', { required: false }) || process.env.GITHUB_TOKEN || null;
        const tag_name = getInput('tag_name', { required: false }) || 'latest';
        const asset_names = getInput('asset_names', { required: false })?.split(',');
        const filepath =
            getInput('path', { required: false }) || process.env.GITHUB_WORKSPACE || process.cwd();
        setOutput('path', filepath);
        const repository =
            getInput('repository', { required: false }) || process.env.GITHUB_REPOSITORY || null;
        const ignore_v_when_searching =
            getInput('ignore_v_when_searching', {
                required: false,
            }) === 'true';

        debug('Loading octokit: started');

        if (!github_token) {
            setFailed('github_token not supplied');
            return;
        }

        debug('Loading octokit: completed');

        let repos: null | Repo = null;

        try {
            repos = repoSplit(repository, context);
        } catch (e) {
            setFailed(`Action failed with error: ${e}`);
        }

        if (!repos) {
            setFailed('Action failed with error: No repository information available');
            return;
        }

        const release = await getReleaseByTag(
            repos.owner,
            repos.repo,
            tag_name,
            github_token,
            undefined,
            ignore_v_when_searching,
        );

        await downloadReleaseAssets(release, asset_names, filepath, repos, github_token, undefined);
    } catch (error: any) {
        setFailed(error.message);
    }
})();
