import { join } from "path";

import { Command } from "../Command";
import { printHelp } from "../util";

new Command(
    "help",
    () => {
        printHelp(join(__dirname, "../../../cli.gen.help.txt"));

        process.exit(0);
    },
    { relatedPositionalArg: 1 }
);
