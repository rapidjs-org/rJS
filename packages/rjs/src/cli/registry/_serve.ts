import { FileServer, createFileServer } from "../../FileServer";
import { DEV_MODE_PREFIX } from "../util";
import { Args } from "../Args";
import { Command } from "../Command";
import { Printer } from "../Printer";
import { InputReader } from "../InputReader";

// TODO: Print virtual files for overview?
new Command("serve", async () => {
    const dev = Args.parseFlag("dev", "D");
    const cert = Args.parseOption("tls-cert", "C").string();

    const passphrase: string = await new Promise((resolve) => {
        if (!cert) {
            resolve(null);

            return;
        }

        const inputReader = new InputReader();
        inputReader
            .questionPromise("Enter key passphrase (leave blank if none)")
            .then((passphrase: string) => {
                resolve(passphrase.length ? passphrase : null);

                inputReader.close();
            });
    });

    const tls = {
        cert: cert,
        key: Args.parseOption("tls-key", "K").string(),

        passphrase
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
