import { debug, getInput, setFailed, setOutput } from '@actions/core';
import * as core from '@actions/core';
import * as github from '@actions/github';

import { Repo } from './types';
import { downloadReleaseAssets, getReleaseByTag, repoSplit } from './utils';

async function run(): Promise<void> {
  try {
    const { context } = github;
    const github_token = getInput('github_token', { required: false }) || process.env.GITHUB_TOKEN || null;
    const tag_name = getInput('tag_name', { required: false }) || 'latest';
    const asset_names = getInput('asset_names', { required: false })?.split(',');
    const filepath = getInput('path', { required: false }) || process.env.GITHUB_WORKSPACE || process.cwd();
    setOutput('path', filepath);
    const repository = getInput('repository', { required: false }) || process.env.GITHUB_REPOSITORY || null;
    const ignore_v_when_searching =
      getInput('ignore_v_when_searching', {
        required: false,
      }) === 'true';
    const only_check_if_exists = getInput('only_check_if_exists', { required: false }) === 'true';
    const do_not_error_if_missing = getInput('do_not_error_if_missing', { required: false }) === 'true';

    debug('Loading octokit: started');

    if (!github_token) {
      setFailed('github_token not supplied');
      return;
    }

    debug('Loading octokit: completed');

    let repos: null | Repo = null;

    try {
      repos = repoSplit(repository, context);
    } catch (error) {
      setFailed(`Action failed with error: ${error}`);
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
    if (release) {
      core.setOutput('release_id', release.id);
      core.setOutput('release_name', release.name);
      core.setOutput('release_tag_name', release.tag_name);
      core.setOutput('release_body', release.body_text);
      core.setOutput('releaseAssets_found', JSON.stringify(release.assets));
    } else {
      core.setOutput('release_id', '');
      core.setOutput('release_name', '');
      core.setOutput('release_tag_name', '');
      core.setOutput('release_body', '');
      core.setOutput('releaseAssets_found', '');
    }
    if (!only_check_if_exists) {
      return downloadReleaseAssets(
        release,
        asset_names,
        filepath,
        repos,
        github_token,
        undefined,
        do_not_error_if_missing,
      );
    }
    return;
  } catch (error: any) {
    setFailed(error?.message);
  }
}
run();
