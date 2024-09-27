import { readFileSync } from "fs";

import { Printer } from "./Printer";

export const DEV_MODE_PREFIX: string = `${Printer.format("DEV", [1, Printer.escapes.PRIMARY_COLOR_FG])} `;

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
