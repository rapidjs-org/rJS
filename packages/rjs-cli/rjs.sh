#! /bin/bash


node "$(dirname $([ -L $0 ] && readlink -f $0 || echo $0))/build/cli.js" $@