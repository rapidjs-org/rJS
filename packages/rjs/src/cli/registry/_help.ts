import { readFileSync } from "fs";
import { join } from "path";

import { Printer } from "../../.shared/Printer";
import { Command } from "../Command";

new Command("help", () => {
    Printer.global.stdout(
        readFileSync(join(__dirname, "../../../cli.help.txt"))
            .toString()
            .replace(
                /(https?:\/\/[^\s]*[^.:;!]+)/g,
                Printer.format("$1", [Printer.escapes.PRIMARY_COLOR_FG], 39)
            )
    );
    process.exit(0);
});
