import * as OpenApiTypes from '@octokit/openapi-types'

export interface Repo {
  owner: string
  repo: string
}

export type Release = OpenApiTypes.components['schemas']['release']
export type ReleaseAsset = OpenApiTypes.components['schemas']['release-asset']
