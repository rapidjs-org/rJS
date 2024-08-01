import { resolve, join } from "path";
import { existsSync, mkdirSync, appendFile } from "fs";

import _config from "../_config.json";


export class Logs {
    public static global: Logs = new Logs();

    private readonly logsDirPath: string;
    private readonly isVerbose: boolean;

    constructor(isVerbose: boolean = false) {
        this.logsDirPath = resolve(_config.logsDirName);
        this.isVerbose = isVerbose;

        !existsSync(this.logsDirPath)
        && mkdirSync(this.logsDirPath, { recursive: true });
    }

    private log(shortMessage: string, verboseMessage?: string, prefix?: string, channel: "stdout"|"stderr" = "stdout") {
        process[channel].write(`${shortMessage}\n`);
        
        const date: Date = new Date();
        const dateKey: string = [
            date.getFullYear().toString().slice(-2),
            (date.getMonth() + 1).toString().padStart(2, "0"),
            date.getDate().toString().padStart(2, "0")
        ].join("-");
        const timeKey: string = [
            date.getHours().toString().padStart(2, "0"),
            date.getMinutes().toString().padStart(2, "0"),
            date.getSeconds().toString().padStart(2, "0"),
        ].join(":");
        appendFile(
            join(this.logsDirPath, dateKey),
            `[${timeKey}]\t${prefix ? `(${prefix}) ` : ""}${
                shortMessage
            }${
                (this.isVerbose && verboseMessage) ? `\n${verboseMessage}`: ""
            }\n`,
            (err) =>  {
            // TODO
        });
    }
    
    public info(shortMessage: string, verboseMessage?: string) {
        this.log(shortMessage, verboseMessage);
    }
    
    public warn(shortMessage: string, verboseMessage?: string) {
        this.log(shortMessage, verboseMessage, "warning");
    }
    
    public error(shortMessage: string, verboseMessage?: string) {
        this.log(shortMessage, verboseMessage, "error", "stderr");
    }
}