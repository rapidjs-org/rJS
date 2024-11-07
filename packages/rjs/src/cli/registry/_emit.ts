import { Printer } from "../../.shared/Printer";
import { Args } from "../../.shared/Args";
import { DEV_MODE_PREFIX } from "../local.constants";
import { createFileEmitter } from "../../FileEmitter";
import { Command } from "../Command";

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
