import { Printer } from "../../.shared/Printer";
import { Args } from "../../.shared/Args";
import { DEV_MODE_PREFIX } from "../local.constants";
import { FileServer, createFileServer } from "../../FileServer";
import { Command } from "../Command";

// TODO: Print virtual files for overview?
// TODO: Interactive mode?
new Command("serve", async () => {
    const dev = Args.parseFlag("dev", "D");
    const cert = Args.parseOption("tls-cert", "C").string();

    const tls = {
        cert: cert,
        key: Args.parseOption("tls-key", "K").string()
    };

    const server: FileServer = await createFileServer({
        dev,
        tls,

        cwd: Args.parseOption("working-dir", "W").string() ?? process.cwd(),
        apiDirPath: Args.parseOption("api-dir").string(),
        sourceDirPath: Args.parseOption("plugins-dir").string(),
        publicDirPath: Args.parseOption("public-dir").string(),
        port: Args.parseOption("port", "P").number()
    });

    Printer.global.stdout(
        `${dev ? DEV_MODE_PREFIX : ""}Server listening on ${Printer.format(
            `http${tls.cert ? "s" : ""}://localhost:${server.port}`,
            [Printer.escapes.TERTIARY_COLOR_FG]
        )}.`
    );
});
