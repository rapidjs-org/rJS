import { FileEmitter } from "../../FileEmitter";
import { FileServer } from "../../FileServer";
import { Args } from "../Args";
import { Command } from "../Command";
import { Printer } from "../Printer";

import _config from "../../_config.json";


new Command("build", async () => {
    const options = {
		privateDirectoryPath: Args.parsePositional(1),
		publicDirectoryPath: Args.parseOption("public").string() ?? undefined
	};

    !Args.parseFlag("serve", "S")
    ? new FileEmitter(options)
        .emit()
        .then(() => Printer.global.stdout(Printer.format("sss", [ 1 ])))
        .catch((err: Error) => Printer.global.stderr(err))
    : new FileServer(options)
        .listen(Args.parseOption("serve", "S").number())
        .then(() => Printer.global.stdout(`Test server listening on ${
            Printer.format(`http://localhost:${Args.parseOption("serve", "S").number() ?? _config.defaultServePort}`, [ Printer.escapes.TERTIARY_COLOR_FG ])
        }.`))
        .catch((err: Error) => Printer.global.stderr(err));
});
