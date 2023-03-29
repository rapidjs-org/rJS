/**
 * Standalone server API module. Provides single process
 * server application operation capabilities for atomic
 * deployment instances.
 */


import { Socket } from "net";

import { IBasicRequest } from "../_interfaces";
import { captionEffectiveHostnames } from "../utils";
import { HTTPServer } from "../HTTPServer";
import { EmbedContext } from "../EmbedContext";
import { handleRequest } from "../process/api.process";
import * as print from "../print";


/**
 * Create the standalone web server instance.
 */
export function serveStandalone() {
    new HTTPServer((iReq: IBasicRequest, socket: Socket) => {
    console.log(iReq)

        handleRequest(iReq, socket);
    }, () => {
        print.info(`Started standalonen application at ${captionEffectiveHostnames()}:${EmbedContext.global.port}`);
    })
}