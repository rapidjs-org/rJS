/**
 * Standalone server API module. Provides single process
 * server application operation capabilities for atomic
 * deployment instances.
 */


import { Socket } from "net";
import { join } from "path";

import { IBasicRequest } from "../../_interfaces";

import { HTTPServer } from "../HTTPServer";
import { ConsoleLogIntercept } from "../ConsoleLogIntercept";
import { FileLogIntercept } from "../FileLogIntercept";
import { ErrorControl } from "../ErrorControl";
import { EmbedContext } from "../EmbedContext";
import { ProcessPool } from "../ProcessPool";
import { captionEffectiveHostnames, messageProxy } from "../utils";


new ConsoleLogIntercept();
new FileLogIntercept(EmbedContext.global.path);


/*
 * Catch any unhandled exception within this worker process
 * in order to prevent process termination,  but simply handle
 * the error case for the respective request.
 */
new ErrorControl();

const processPool: ProcessPool = new ProcessPool(join(__dirname, "../process/api.process"));

processPool.init();


/**
 * Create the standalone web server instance.
 */
export async function serveStandalone() {
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