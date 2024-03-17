#! /bin/bash

if [ -z "$1" ]; then
    echo "Missing C++ build name"
    exit 1
fi
if [ -z "$2" ]; then
    echo "Missing destination path"
    exit 1
fi

SHM_PATH=$(<"$(dirname "$0")/../.shmpath")
ADDON_MODULE_FILENAME="sharedmemory.node"
SRC_PATH="$(dirname "$0")/../src/${SHM_PATH}/build/$2/${ADDON_MODULE_FILENAME}"
DEST_PATH="$(dirname "$0")/../$1/${SHM_PATH}/${ADDON_MODULE_FILENAME}"

cp "${SRC_PATH}" "${DEST_PATH}"