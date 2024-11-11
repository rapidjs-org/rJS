import { join } from "path";
import {
    existsSync,
    mkdirSync,
    appendFile,
    readdirSync,
    readdir,
    statSync,
    rm,
    statfsSync
} from "fs";

export class Logger {
    private readonly logsDirPath: string;
    private readonly silent: boolean;
    private readonly maxFilesSizeKB: number;

    private filesSizeB: number;
    private lastMessage: string;

    constructor(
        logsDirPath: string | null = null,
        silent: boolean = false,
        maxFilesSizeKB = Infinity
    ) {
        this.silent = silent;

        if (!logsDirPath) return;

        this.logsDirPath = logsDirPath;
        this.maxFilesSizeKB = maxFilesSizeKB;

        !existsSync(this.logsDirPath) &&
            mkdirSync(this.logsDirPath, {
                recursive: true
            });

        this.filesSizeB = readdirSync(this.logsDirPath, {
            recursive: true
        })
            .map(
                (relativePath: string | Buffer) =>
                    statSync(join(this.logsDirPath, relativePath.toString()))
                        .size
            )
            .reduce((acc: number, fileSizeKB: number) => acc + fileSizeKB, 0);
    }

    private log(
        shortMessage: string | Buffer,
        verboseMessage?: string,
        prefix?: string,
        channel: "stdout" | "stderr" = "stdout"
    ) {
        // TODO: Filter redundant messages (worker copies)
        !this.silent &&
            process[channel].write(
                shortMessage.toString().replace(/\n?$/, "\n")
            );

        if (!this.logsDirPath) return;

        const date: Date = new Date();
        const dateKey: string = [
            date.getFullYear().toString().slice(-2),
            (date.getMonth() + 1).toString().padStart(2, "0"),
            date.getDate().toString().padStart(2, "0")
        ].join("-");
        const logFilePath: string = join(this.logsDirPath, `${dateKey}.log`);

        const interceptLogError = (err: Error) =>
            err && !this.silent && console.error(err);

        const serialMessage: string =
            shortMessage.toString() + (verboseMessage ?? "");
        if (existsSync(logFilePath) && this.lastMessage === serialMessage) {
            appendFile(logFilePath, "+1", interceptLogError);

            return;
        }
        this.lastMessage = serialMessage;

        const timeKey: string = [
            date.getHours().toString().padStart(2, "0"),
            date.getMinutes().toString().padStart(2, "0"),
            date.getSeconds().toString().padStart(2, "0")
        ].join(":");
        const logMessage: string = `[${timeKey}]\t${
            prefix ? `(${prefix}) ` : ""
        }${shortMessage.toString()}${
            verboseMessage ? `\n${verboseMessage}` : ""
        }\n`;
        appendFile(logFilePath, logMessage, interceptLogError);

        const statsFs = statfsSync(this.logsDirPath);
        const freeSizeKB: number = statsFs.bsize * statsFs.bavail * 2 ** -10;
        this.filesSizeB += logMessage.length;
        if (
            this.filesSizeB * 2 ** -10 <=
            Math.min(this.maxFilesSizeKB, freeSizeKB)
        )
            return;

        readdir(this.logsDirPath, (err: Error, files: string[]) => {
            if (err) {
                interceptLogError(err);

                return;
            }
            rm(files.sort().shift(), interceptLogError);
        });
    }

    public info(shortMessage: string, verboseMessage?: string) {
        this.log(shortMessage, verboseMessage);
    }

    public warn(shortMessage: string, verboseMessage?: string) {
        this.log(shortMessage, verboseMessage, "warning");
    }

    public error(error: Error): void;
    public error(shortMessage: string, verboseMessage?: string): void;
    public error(errorOrShortMessage: Error | string, verboseMessage?: string) {
        const shortMessage: string =
            errorOrShortMessage instanceof Error
                ? errorOrShortMessage.message
                : errorOrShortMessage;

        this.log(shortMessage, verboseMessage, "error", "stderr");
    }
}
