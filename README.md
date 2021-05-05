# github-actions-download-release-asset

This action downloads a release asset from a release to the current workflow

```yml
name: 🚢 Deploy
on:
  workflow_dispatch:
    inputs:
      deploy-tag:
        description: 'Git tag name to deploy'
        required: true
      swap:
        description: 'After deploying code to a passive environment, swap the passive and active environments'
        required: false
        default: 'false'
      terminate:
        description: 'After successfully swapping the deployed code to the active environment, terminate the previous environment'
        required: false
        default: 'false'
  deploy:
    runs-on: Ubuntu-18.04
    name: Deployment Process

    steps:
      # ...
      - uses: Broadshield/github-actions-download-release-asset@main
        name: Download Release by Tag
        id: download
        with:
          tag_name: ${{ github.event.inputs.deploy-tag }}
          path: deploy
          asset_names: ROOT.war
          github_token: ${{github.token}}
          repository: ${{github.repository}}
    # ...
```
