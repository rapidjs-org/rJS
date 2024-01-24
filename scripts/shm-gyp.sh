#! /bin/bash

cd "$(dirname "$0")/../src/process/thread/sharedmemory/"

if [ -z "$1" ]; then
    echo "Missing node-gyp command"
    exit 1
fi

npx node-gyp "$@"