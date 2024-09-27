import _config from "../_config.json";

process.title = _config.cliProcessTitle;

import { Dirent, readdirSync } from "fs";
import { join } from "path";

import { Command } from "./Command";
import { Printer } from "./Printer";

process.on("uncaughtException", (err: Error) => {
    Printer.global.stderr(err, {
        replicatedMessage: true
    });

    process.exit(1);
});

// Dynamically load command registry definitions
function loadCmd(relativePath: string) {
    readdirSync(join(__dirname, relativePath), {
        withFileTypes: true
    })
        .filter((dirent: Dirent) => /^_[a-z0-9_-]+(\.js)?$/.test(dirent.name))
        .forEach((dirent: Dirent) => {
            require(
                join(
                    dirent.parentPath,
                    dirent.name,
                    dirent.isDirectory() ? dirent.name : ""
                )
            );
        });
}

loadCmd("registry");
loadCmd("registry.generate");

// Execute targeted command handler
Command.eval(0, "State a command to execute.");
