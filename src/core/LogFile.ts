import { mkdirSync, appendFile, readdirSync, rmSync } from "fs";
import { freemem } from "os";
import { join } from "path";

import { ALogIntercept } from "../ALogIntercept";
import { AsyncMutex } from "./AsyncMutex";


export class LogFile extends ALogIntercept {

    private static writeErrorRetryTimeout: number = 60000 * 60; // 1 hour

    private path: string;
    private hadWriteError = false;
    private mutex: AsyncMutex<void> = new AsyncMutex();

    constructor(path: string) {
    	super();

    	if(!path) return;
        
    	this.path = path;

    	mkdirSync(this.path, {
    		recursive: true
    	});
    }

    private writeFile(message: string) {
    	if(!this.path) return;

    	const freeMemInB: number = freemem();
    	if(freeMemInB < message.length || freeMemInB < 1024) {  // Rotate files if free memory does not suffice or is below 1 KiB
    		for(const dirent of readdirSync(this.path, {
    			withFileTypes: true
    		})) {
    			if(!dirent.isFile()) continue;

    			rmSync(join(this.path, dirent.name));

    			break;
    		}
    	}
        
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
    
    protected handleStderr(message: string, passthrough = false) {
    	if(passthrough || (this.getGroupCount(message) > 1)) return;

    	this.writeFile(message);
    }
    
}

// TODO: LOG FILE ROTATION (PREVENT EXCESSIVE FILE SIZES) (on fs level, on f level)