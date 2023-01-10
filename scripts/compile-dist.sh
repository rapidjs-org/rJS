#!/bin/bash

cd ./src/processs/shared-memory/
node-gyp build                                                  # Compile C++ source (in-place)

cd ../../../
rm -rf ./dist/                                                  # Remove /dist directory to remove stale contents
tsc --outDir ./dist/                                            # Compile TypeScript source
cp ./src/reverse-proxy/help.txt ./dist/reverse-proxy/help.txt   # Copy help message text file
cp ./src/process/shared-memory/build/Release/shared_memory.node ./dist/process/shared-memory/shared-memory.node
                                                                # Copy compilation of shared memory N-API module for access