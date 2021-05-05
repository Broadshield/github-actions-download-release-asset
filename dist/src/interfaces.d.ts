import * as OpenApiTypes from '@octokit/openapi-types';
export interface Repo {
    owner: string;
    repo: string;
}
export declare type Release = OpenApiTypes.components['schemas']['release'];
export declare type ReleaseAsset = OpenApiTypes.components['schemas']['release-asset'];
