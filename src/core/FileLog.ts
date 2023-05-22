import _config from "../_config.json";

import { mkdirSync, appendFile } from "fs";
import { join } from "path";

import { ALogIntercept } from "./LogIntercept";

import { AsyncMutex } from "./AsyncMutex";


export class FileLog extends ALogIntercept {

    private static writeErrorRetryTimeout: number = 60000 * 60; // 1 hour

    private path: string;
    private swallowPrint: boolean;
    private hadWriteError: boolean = false;
    private mutex: AsyncMutex<void> = new AsyncMutex();

    constructor(path: string, swallowPrint: boolean = false) {
        super();

        // TODO: Global log path configuration?

        this.swallowPrint = swallowPrint;
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
                }, FileLog.writeErrorRetryTimeout);

                this.handleStderr(`Could not write to log directory. ${err?.message ?? message}`, 0, true);
            });
        });
    }

    public handleStdout(message: string, groupCount: number): string {
        (groupCount <= 1)
        && this.writeFile(message);

        if(this.swallowPrint) return null;
        
        return message;
    }
    
    public handleStderr(message: string, groupCount: number, passthrough: boolean = false): string {
        if(passthrough) return message;
        
        (groupCount <= 1)
        && this.writeFile(message);

        if(this.swallowPrint) return null;
        
        return message;
    }
    
}

// TODO: LOG FILE ROTATION (PREVENT EXCESSIVE FILE SIZES) (on fs level, on f level)