/**
 * Proxied process cluster process thread API module.
 */


import { parentPort } from "worker_threads";

import { TConcreteAppAPI, TConcreteAppHandler } from "../../_types";
import { IRequest } from "../../_interfaces";
import { EmbedContext } from "../EmbedContext";
import { ErrorControl } from "../ErrorControl";

import * as concreteAPI from "./api.concrete";


if(!EmbedContext.global.concreteAppModulePath) {
    throw new ReferenceError("Missing concrete application module path");
}


new ErrorControl(); // TODO: Message up?


/*
 * Import the concrete server application to be interpreted
 * in the cluster in order to pass it the development API
 * module for setup. The setup is then presumed to return a
 * constrained request handler that is to be invoked with
 * each recieved request and eventually returning a
 * respective response package send over the parental process
 * controlled socket connection.
 */
let concreteAppHandler: TConcreteAppHandler;
import(EmbedContext.global.concreteAppModulePath)
.then((api: {
    default: (concreteAPI: TConcreteAppAPI) => TConcreteAppHandler
}) => {
    concreteAppHandler = api.default(concreteAPI);
    
    // Signal parent process the thread is ready for being
    // assigned request data
    parentPort.postMessage(true);
});

/*
 * Listen for incoming requests to handle with specified routine.
 */
parentPort.on("message", (sReq: IRequest) => {    
    parentPort.postMessage(
        concreteAppHandler(sReq)
    );
});