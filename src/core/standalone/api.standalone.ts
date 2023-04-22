/**
 * Standalone server API module. Provides single process
 * server application operation capabilities for atomic
 * deployment instances.
 */


import { Socket } from "net";

import { IBasicRequest } from "../../_interfaces";

import { HTTPServer } from "../HTTPServer";
import { FileLog } from "../FileLog";
import { EmbedContext } from "../EmbedContext";
import { handleRequest } from "../process/api.process";
import { captionEffectiveHostnames, messageProxy } from "../utils";


//new FileLog(EmbedContext.global.path);


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
            handleRequest(iReq, socket);
        }, () => {
            console.log(`Started standalone application cluster at ${captionEffectiveHostnames()}:${EmbedContext.global.port}`);
        });
    } catch(err) {
        console.error(`Could not embed application to proxy: ${err.message}`);
    }
}