import _config from "../_config.json";

import { mkdirSync, appendFile } from "fs";
import { join } from "path";

import { ALogIntercept } from "../ALogIntercept";

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

        /* mkdirSync(this.path, {
            recursive: true
        }); */
    }

    private writeFile(message: string) {
        message = message.replace(/\x1b\[[0-9;]+m/g, "");    // Remove possibly occurring ANSII formatting codes
        
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

                this.handleStderr(`Could not write to log directory. ${err?.message ?? message}`, true);
            });
        });
    }

    protected handleStdout(data: string): string {
        /* this.writeFile(data);

        if(this.swallowPrint) return;
 */
        return data;
    }
    
    protected handleStderr(data: string, passthrough: boolean = false): string {
        /* if(passthrough) return data;
        
        this.writeFile(data);

        if(this.swallowPrint) return;
 */
        return data;
    }
    
}

// TODO: LOG FILE ROTATION (PREVENT EXCESSIVE FILE SIZES) (on fs level, on f level)