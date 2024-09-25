import { readFileSync } from "fs";

import { Printer } from "./Printer";

export function printHelp(helpfilePath: string) {
    Printer.global.stdout(
        readFileSync(helpfilePath)
            .toString()
            .replace(
                /(https?:\/\/[^\s]*[^.:;!]+)/g,
                Printer.format("$1", [Printer.escapes.PRIMARY_COLOR_FG], 39)
            )
    );
}
