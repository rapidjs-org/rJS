/**
 * Standalone server API module. Provides single process
 * server application operation capabilities for atomic
 * deployment instances.
 */


import { Socket } from "net";

import { IBasicRequest } from "../_interfaces";
import { HTTPServer } from "../HTTPServer";
import { handleRequest } from "../process/api.process";


/**
 * Create the standalone web server instance.
 */
export function serveStandalone() {
    new HTTPServer((iReq: IBasicRequest, socket: Socket) => {
        handleRequest(iReq, socket);
    });
}