import { ChildProcess, fork } from "child_process";
import { join } from "path";

import { Command } from "../../Command";
import { Printer } from "../../Printer";
import { Dependency } from "../Dependency";
import { ARG_CONTEXT } from "../ARG_CONTEXT";


new Command("start", () => {
    new Dependency("@rapidjs.org/rjs-proxy")
    .installIfNotPresent()
    .then(() => {
        const detachedProcess: ChildProcess = fork(join(__dirname, "./detached"), process.argv.slice(2), {
            silent: true
        }).on("message", () => {
            detachedProcess.disconnect();
            
            Printer.global.stdout(`Embedded application context ${
                (ARG_CONTEXT.hostnames.length > 1)
                ? `[${ARG_CONTEXT.hostnames.join("|")}]`
                : ARG_CONTEXT.hostnames[0]
            }:${
                ARG_CONTEXT.port
            }`);

            process.exit(0);
        });

        detachedProcess.stdout.on("data", (data: Buffer) => {
            Printer.global.stdout(data.toString());
        });
        detachedProcess.stderr.on("data", (data: Buffer) => {
            Printer.global.stderr(data.toString());

            process.exit(1);
        });
    });
});

// TODO: "Daemonize", i.e. add recreate state upon startup mechanism (?)