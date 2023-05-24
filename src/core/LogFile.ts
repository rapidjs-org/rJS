import _config from "./_config.json";

import { mkdirSync, appendFile } from "fs";
import { join } from "path";

import { ALogIntercept } from "../ALogIntercept";
import { AsyncMutex } from "./AsyncMutex";


export class LogFile extends ALogIntercept {

    private static writeErrorRetryTimeout: number = 60000 * 60; // 1 hour

    private path: string;
    private hadWriteError: boolean = false;
    private mutex: AsyncMutex<void> = new AsyncMutex();

    constructor(path: string) {
        super();

        // TODO: Global log path configuration?

        this.path = join(path, _config.logFileDirName);

        mkdirSync(this.path, {
            recursive: true
        });
    }

    private writeFile(message: string) {
        message = message
        .replace(/\x1b\[[0-9;]+m/g, "")
        .trim();    // Remove possibly occurring ANSII formatting codes
        
        const date: Date = new Date();
        const day: string = date.toISOString().split("T")[0];
        const time: string = date.toLocaleTimeString();

        this.mutex.lock(() => {
            appendFile(join(this.path, `${day}.log`),
            `[${time}]: ${message}\n`,
            err => {
                if(!this.hadWriteError) return;
                
                this.hadWriteError = true;

                setTimeout(() => {
                    this.hadWriteError = false;
                }, LogFile.writeErrorRetryTimeout);

                this.handleStderr(`Could not write to log directory. ${err?.message ?? message}`);
            });
        });
    }
    
    protected handleStdout(message: string) {
        if(this.getGroupCount(message) > 1) return;

        this.writeFile(message);
    }
    
    protected handleStderr(message: string, passthrough: boolean = false) {
        if(passthrough || (this.getGroupCount(message) > 1)) return;

        this.writeFile(message);
    }
    
}

// TODO: LOG FILE ROTATION (PREVENT EXCESSIVE FILE SIZES) (on fs level, on f level)