import { readFileSync } from "fs";
import { join } from "path";

import { Command } from "../Command";
import { Printer } from "../Printer";


new Command("help", () => {
    Printer.global.stdout(readFileSync(join(__dirname, "../../cli.help.txt")).toString());

    process.exit(0);
});