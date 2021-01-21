#!/usr/bin/env bash
set +x -e
if [ -f .github/scripts/install_prereqs.sh ]; then
    # shellcheck source=install_prereqs.sh
    source .github/scripts/install_prereqs.sh
    if [ -f .node-version ]; then
        NODE_VERSION_IMAGE="node:$(cat .node-version)"

        if [ -f "Dockerfile" ]; then
            ACTION_NODE_VERSION="$(sed -n "1 s|^FROM \(.*\)$|\1|p" Dockerfile)"
            if [ "${NODE_VERSION_IMAGE}" != "${ACTION_NODE_VERSION}" ]; then
                echo "Updating Dockerfile Node Version from ${ACTION_NODE_VERSION} to ${NODE_VERSION_IMAGE}"
                if [ "$(uname)" == "Darwin" ]; then
                    sed -i '' -e "1 s|FROM .*|FROM ${NODE_VERSION_IMAGE}|" Dockerfile
                else
                    sed -i -e "1 s|FROM .*|FROM ${NODE_VERSION_IMAGE}|" Dockerfile
                fi
                
                command_exists git && git add Dockerfile
            fi
        fi

        if [ -f ".github/workflows/run_tests.yml" ]; then
            WORKFLOW_NODE_VERSION="$(yq -r '.jobs.unit_tests.container.image' .github/workflows/run_tests.yml)"
            if [ "${NODE_VERSION_IMAGE}" != "${WORKFLOW_NODE_VERSION}" ]; then
                echo "Updating .github/workflows/run_tests.yml Node Version from ${WORKFLOW_NODE_VERSION} to ${NODE_VERSION_IMAGE}"
                yq -i -Y --arg v "${NODE_VERSION_IMAGE}" '.jobs.unit_tests.container.image = $v' .github/workflows/run_tests.yml
                command_exists git && git add .github/workflows/run_tests.yml
            fi
        fi
    fi
fi
