/**
 * Standalone server API module. Provides single process
 * server application operation capabilities for atomic
 * deployment instances.
 */


import _config from "../_config.json";


import { Socket } from "net";
import { join } from "path";

import { IBasicRequest } from "../../_interfaces";
import { Args } from "../../Args";

import { HTTPServer } from "../HTTPServer";
import { LogFile } from "../LogFile";
import { ErrorControl } from "../ErrorControl";
import { EmbedContext } from "../EmbedContext";
import { ProcessPool } from "../ProcessPool";
import { messageProxy } from "../utils";


/**
 * Create the standalone web server instance.
 */
export async function serve() {   
    try {
        await messageProxy(EmbedContext.global.port, "monitor");

        console.error(`Port is occupied by proxy :${EmbedContext.global.port}`);
        // TODO: Prompt if to embed into proxy (and vice versa: exisiting standlone into new proxy)
        // OR: Use standlone always first, but add proxy cluster automatically in case additional app is started
        
        process.exit(1);
    } catch {}
    
    const processPool: ProcessPool = new ProcessPool(join(__dirname, "../process/api.process"));
    
    processPool.on("stdout", (message: string) => console.log(message));
    processPool.on("stderr", (err: string) => console.error(err));
    
    processPool.init();

    new ErrorControl();

    try {
        const server = new HTTPServer((iReq: IBasicRequest, socket: Socket) => {
            processPool.assign({
                iReq, socket
            });
        }, () => {
            new LogFile(Args.global.parseOption("logs").string);

            console.log("Started standalone application cluster");
        });

        EmbedContext.global.isSecure
        && server.setSecureContext(EmbedContext.global.hostnames, join(EmbedContext.global.path, Args.global.parseOption("ssl").string ?? _config.sslDir));
    } catch(err) {
        throw new Error(`Could not start application:\n${err.message}`);
    }
}