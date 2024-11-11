import { ChildProcess, fork } from "child_process";

import { Printer } from "../../.shared/Printer";
import { Args } from "../../.shared/Args";
import { DEV_MODE_PREFIX } from "../local.constants";
import { Command } from "../Command";
import { join } from "path";
import { IServeData } from "./detached/serve";

// TODO: Print virtual files for overview?
// TODO: Interactive mode?
new Command("serve", async () => {
    const serveData: IServeData = {
        dev: Args.parseFlag("dev", "D"),
        tls: {
            cert: Args.parseOption("tls-cert", "C").string(),
            key: Args.parseOption("tls-key", "K").string()
        },
        cwd: Args.parseOption("working-dir", "W").string() ?? process.cwd(),
        apiDirPath: Args.parseOption("api-dir").string(),
        sourceDirPath: Args.parseOption("plugins-dir").string(),
        publicDirPath: Args.parseOption("public-dir").string(),
        port: Args.parseOption("port", "P").number()
    };
    const detachedModulePath: string = join(__dirname, "./detached/serve");

    const port: number = Args.parseFlag("detached")
        ? await new Promise<number>((resolve) => {
              const detachProcess: ChildProcess = fork(detachedModulePath);

              detachProcess.on("message", (message: string) => {
                  resolve(parseInt(message));

                  detachProcess.disconnect();
                  detachProcess.unref();

                  Printer.global.stdout(
                      Printer.format(
                          `PID (detached): ${Printer.format(
                              detachProcess.pid.toString(),
                              [Printer.escapes.PRIMARY_COLOR_FG],
                              [39]
                          )}`,
                          [2],
                          [22]
                      )
                  );
              });

              detachProcess.send(serveData);
          })
        : await (
              (await import(detachedModulePath)) as {
                  serve: (data: IServeData) => Promise<number>;
              }
          ).serve(serveData);

    Printer.global.stdout(
        `${serveData.dev ? DEV_MODE_PREFIX : ""}Server listening on ${Printer.format(
            `http${serveData.tls.cert ? "s" : ""}://localhost:${port}`,
            [Printer.escapes.TERTIARY_COLOR_FG]
        )}.`
    );
});
