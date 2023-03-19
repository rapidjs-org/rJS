/**
 * Standalone server API module. Provides single process
 * server application operation capabilities for atomic
 * deployment instances.
 */


import { Socket } from "net";

import { IBasicRequest } from "../_interfaces";
import { HTTPServer } from "../HTTPServer";


/*
 * Create the standalone web server instance.
 */
new HTTPServer((socket: Socket, iReq: IBasicRequest) => {
    // TODO: Connect process
});
