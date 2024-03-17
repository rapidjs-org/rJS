#! /bin/bash

SHM_PATH=$(<"$(dirname "$0")/.shmpath")

cd "$(dirname "$0")/../src/${SHM_PATH}"

if [ -z "$1" ]; then
    echo "Missing node-gyp command"
    exit 1
fi

npx node-gyp "$@"