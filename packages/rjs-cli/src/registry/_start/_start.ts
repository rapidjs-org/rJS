import { ChildProcess, fork } from "child_process";
import { join } from "path";

import { Command } from "../../Command";
import { Printer } from "../../Printer";
import { Dependency } from "../Dependency";
import { CONTEXT } from "../CONTEXT";


new Command("start", () => {
    new Dependency("@rapidjs.org/rjs-proxy")
    .installIfNotPresent()
    .then(() => {
        const detachedProcess: ChildProcess = fork(join(__dirname, "./api.detached.embed"), process.argv.slice(2), {
            silent: true
        }).on("message", () => {
            detachedProcess.disconnect();
            
            Printer.global.stdout(`Embedded application context ${
                (CONTEXT.hostnames.length > 1)
                ? `[${CONTEXT.hostnames.join("|")}]`
                : CONTEXT.hostnames[0]
            }:${
                CONTEXT.port
            }`);

            process.exit(0);
        });

        detachedProcess.stdout.on("data", (data: Buffer) => {
            Printer.global.stdout(data.toString(), {
                replicatedMessage: true
            });
        });
        detachedProcess.stderr.on("data", (data: Buffer) => {
            Printer.global.stderr(data.toString(), {
                replicatedMessage: true
            });

            process.exit(1);
        });
    });
});

// TODO: "Daemonize", i.e. add recreate state upon startup mechanism (?)