#! /bin/bash

if [ -z "$1" ]; then
    echo "Missing build directory"
    exit 1
fi

ADDON_MODULE_FILENAME="sharedmemory.node"
SRC_PATH="$(dirname "$0")/../src/process/thread/sharedmemory/build/$1/${ADDON_MODULE_FILENAME}"
DEBUG_PATH="$(dirname "$0")/../debug/process/thread/sharedmemory/${ADDON_MODULE_FILENAME}"

cp "${SRC_PATH}" "${DEBUG_PATH}"