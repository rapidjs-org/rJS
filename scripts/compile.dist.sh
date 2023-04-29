#!/bin/bash

cd ./src/core/shared-memory/
node-gyp build                                                  # Compile C++ source (in-place)

cd ../../../
rm -rf ./dist/                                                  # Remove /dist directory to remove stale contents
tsc --outDir ./dist/                                            # Compile TypeScript source
cp ./src/_help.txt ./dist/_help.txt                       # Copy help message text file
cp ./src/core/shared-memory/build/Release/shared_memory.node ./dist/core/shared-memory/shared-memory.node
                                                                # Copy compilation of shared memory N-API module for access