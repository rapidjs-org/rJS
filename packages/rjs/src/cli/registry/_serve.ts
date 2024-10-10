import { FileServer, createFileServer } from "../../FileServer";
import { DEV_MODE_PREFIX } from "../util";
import { Args } from "../Args";
import { Command } from "../Command";
import { Printer } from "../Printer";

// TODO: Print virtual files for overview?
new Command("serve", () => {
    const dev = Args.parseFlag("dev", "D");
    const tls = {
        cert: Args.parseOption("tls-cert", "C").string(),
        key: Args.parseOption("tls-key", "K").string()
    };

    createFileServer({
        dev,
        tls,

        cwd: Args.parseOption("working-dir", "W").string() ?? process.cwd(),
        apiDirPath: Args.parseOption("api-dir").string(),
        pluginDirPath: Args.parseOption("plugins-dir").string(),
        publicDirPath: Args.parseOption("public-dir").string(),
        port: Args.parseOption("port", "P").number()
    })
        .then((server: FileServer) => {
            Printer.global.stdout(
                `${
                    dev ? DEV_MODE_PREFIX : ""
                }Server listening on ${Printer.format(
                    `http${tls.cert ? "s" : ""}://localhost:${server.port}`,
                    [Printer.escapes.TERTIARY_COLOR_FG]
                )}.`
            );
        })
        .catch((err: Error) => Printer.global.stderr(err));
});
