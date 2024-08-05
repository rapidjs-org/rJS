#! /bin/bash


cd $(cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd)

node ./build/cli.js $@