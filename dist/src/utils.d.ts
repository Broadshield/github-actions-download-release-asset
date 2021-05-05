import { Context } from '@actions/github/lib/context';
import { GitHub } from '@actions/github/lib/utils';
import { Octokit } from '@octokit/rest';
import { Release, Repo } from './interfaces';
export declare function repoSplit(inputRepo: string | undefined | null, context: Context | undefined | null): Repo | null;
export declare function getReleaseByTag(owner: string, repo: string, tagName: string, octokit: InstanceType<typeof GitHub>, ignore_v_when_searching?: boolean): Promise<Release | undefined>;
export declare const checker: (arr: string[], target: string[]) => boolean;
export declare function downloadReleaseAssets(release: Release | undefined, asset_names: string[], filepath: string, repos: Repo, token: string, octokitInstance: InstanceType<typeof GitHub> | InstanceType<typeof Octokit> | undefined): Promise<void>;
