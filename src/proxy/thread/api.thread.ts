/**
 * Proxied process cluster process thread API module.
 */


import { parentPort } from "worker_threads";

import { IRequest, IResponse } from "../../_interfaces";

import { EmbedContext } from "../EmbedContext";

import * as concreteAPI from "./api.concrete";


type TConcreteAppHandler = (req: IRequest) => IResponse;


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
.then((api: (concreteAPI: typeof import("./api.concrete")) => TConcreteAppHandler) => {
    concreteAppHandler = api(concreteAPI);

    // Signal parent process the thread is ready for being
    // assigned request data
    parentPort.postMessage(true);
});


/*
 * Listen for 
 */
parentPort.on("message", (sReq: IRequest) => {
    parentPort.postMessage(
        concreteAppHandler(sReq)
    );
});