#! /bin/bash


if [ -z "$1" ]; then
    echo "Missing destination path"
    exit 1
fi

mkdir -p "$(dirname "$0")/../$1/cli/"

HELP_FILENAME="_help.txt"
SRC_PATH="$(dirname "$0")/../src/cli/${HELP_FILENAME}"
DEST_PATH="$(dirname "$0")/../$1/cli/${HELP_FILENAME}"

cp "${SRC_PATH}" "${DEST_PATH}"