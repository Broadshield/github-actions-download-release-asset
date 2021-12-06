import { components } from '@octokit/openapi-types';

export interface Repo {
    owner: string;
    repo: string;
}
export type Repository = components['schemas']['full-repository'];
export type Release = components['schemas']['release'];
export type ReleaseAsset = components['schemas']['release-asset'];
