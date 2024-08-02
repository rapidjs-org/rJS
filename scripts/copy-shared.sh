#! /bin/bash


cd $(cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd)

cp -r ../packages/shared/. ../packages/$1/src/.shared