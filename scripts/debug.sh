#!/bin/bash

CONCRETE_APP_MODULE="${2:-asset.integration}"

case $1 in
	start:proxy)
		node ./debug/cli/api.cli.js start ./test/integration/$CONCRETE_APP_MODULE -P 7070 -W ./test/integration/ -L ../logs/
		;;
	start:standalone)
		node ./debug/cli/api.cli.js start ./test/integration/$CONCRETE_APP_MODULE -P 7070 -W ./test/integration/ -L ../logs/ --standalone
		;;
	stop)
		node ./debug/cli/api.cli.js stop -P 7070
		;;
    *)
        tput setaf 1
        echo "Specify debug command ∈ { start:proxy, start:standalone, stop }"
        tput sgr0
esac