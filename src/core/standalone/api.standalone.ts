/**
 * Standalone server API module. Provides single process
 * server application operation capabilities for atomic
 * deployment instances.
 */


import { Socket } from "net";
import { join } from "path";

import { IBasicRequest } from "../../_interfaces";
import { LogConsole } from "../../LogConsole";

import { HTTPServer } from "../HTTPServer";
import { LogFile } from "../LogFile";
import { ErrorControl } from "../ErrorControl";
import { EmbedContext } from "../EmbedContext";
import { ProcessPool } from "../ProcessPool";
import { captionEffectiveHostnames, messageProxy } from "../utils";


/**
 * Create the standalone web server instance.
 */
export async function serveStandalone() {
    new LogConsole();
    new LogFile(EmbedContext.global.path);
    
    new ErrorControl();
    
    
    const processPool: ProcessPool = new ProcessPool(join(__dirname, "../process/api.process"));
    
    processPool.on("stdout", (message: string) => console.log(message));
    processPool.on("stderr", (err: string) => console.error(err));
    
    processPool.init();

    try {
        await messageProxy(EmbedContext.global.port, "monitor");

        console.error(`Port is occupied proxy :${EmbedContext.global.port}`);
        // TODO: Prompt if to embed into proxy (and vice versa: exisiting standlone into new proxy)
        // OR: Use standlone always first, but add proxy cluster automatically in case additional app is started
        
        return;
    } catch {}

    try {
        new HTTPServer((iReq: IBasicRequest, socket: Socket) => {
            processPool.assign({
                iReq, socket
            });
        }, () => {
            console.log(`Started standalone application cluster at ${captionEffectiveHostnames()}:${EmbedContext.global.port}`);
        });
    } catch(err) {
        console.error(`Could not embed application to proxy: ${err.message}`);
    }
}