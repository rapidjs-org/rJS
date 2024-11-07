#!/usr/bin/env node

import { Args } from "./.shared/Args";
import { Printer } from "./.shared/Printer";
import { create } from "./api";

const interceptBubblingError = (err: Error) => {
    Printer.global.stderr(err, {
        replicatedMessage: true
    });

    process.exit(1);
};
process.on("uncaughtException", interceptBubblingError);
process.on("unhandledRejection", interceptBubblingError);

const templateName: string = Args.parsePositional(0);
create(templateName).then(() => {
    Printer.global.stdout(
        `Template created ${Printer.format(
            `${templateName}/`,
            Printer.escapes.PRIMARY_COLOR_FG,
            39
        )}`
    );

    process.exit();
});
