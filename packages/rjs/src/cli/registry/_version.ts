import { readFileSync } from "fs";
import { join } from "path";

import { Command } from "../Command";
import { Printer } from "../Printer";

new Command("version", () => {
    const packageObj = JSON.parse(
        readFileSync(join(__dirname, "../../../package.json")).toString()
    ) as {
        version: string;
    };

    packageObj.version
        ? Printer.global.stdout(`v${packageObj.version}`)
        : Printer.global.stderr("Could not read version");
});
