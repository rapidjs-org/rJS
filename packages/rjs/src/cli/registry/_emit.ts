import { createFileEmitter } from "../../FileEmitter";
import { DEV_MODE_PREFIX } from "../util";
import { Args } from "../Args";
import { Command } from "../Command";
import { Printer } from "../Printer";

new Command("emit", () => {
    const dev: boolean = Args.parseFlag("dev", "D");

    createFileEmitter({
        dev,

        cwd: Args.parseOption("working-dir", "W").string() ?? process.cwd(),
        sourceDirPath: Args.parseOption("plugins-dir").string(),
        publicDirPath: Args.parseOption("public-dir").string()
    })
        .emit()
        .then(() =>
            Printer.global.stdout(
                `${dev ? DEV_MODE_PREFIX : ""}Files successfully emitted.`
            )
        )
        .catch((err: Error) => Printer.global.stderr(err));
});
