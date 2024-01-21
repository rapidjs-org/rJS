#! /bin/bash

cd "$(dirname "$0")/../src/process/thread/shared-memory/"

function throw_error {
    echo "$1"
    exit 1
}

if [ -z "$1" ]; then
    throw_error "Missing node-gyp command";
fi

npx node-gyp "$@"