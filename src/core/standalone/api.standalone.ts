/**
 * Standalone server API module. Provides single process
 * server application operation capabilities for atomic
 * deployment instances.
 */


import { Socket } from "net";

import { IBasicRequest } from "../../_interfaces";
import * as print from "../../print";

import { HTTPServer } from "../HTTPServer";
import { EmbedContext } from "../EmbedContext";
import { handleRequest } from "../process/api.process";
import { captionEffectiveHostnames, messageProxy } from "../utils";


// TODO: Standlone by default if is only server application, induce proxy if additional app is started

/**
 * Create the standalone web server instance.
 */
export async function serveStandalone() {
    try {
        await messageProxy(EmbedContext.global.port, "monitor");

        print.error(`Port is occupied proxy :${EmbedContext.global.port}`);
        // TODO: Prompt if to embed into proxy (and vice versa: exisiting standlone into new proxy)
        // OR: Use standlone always first, but add proxy cluster automatically in case additional app is started
        
        return;
    } catch {}

    try {
        new HTTPServer((iReq: IBasicRequest, socket: Socket) => {
            handleRequest(iReq, socket);
        }, () => {
            print.info(`Started standalone application cluster at ${captionEffectiveHostnames()}:${EmbedContext.global.port}`);
        });
    } catch(err) {
        print.error(`Could not embed application to proxy: ${err.message}`);
    }
}

setTimeout(() => console.log(82), 1000);