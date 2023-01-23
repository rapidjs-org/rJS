import { parentPort } from "worker_threads";

import { IRequest } from "../../interfaces";
import { SHELL } from "../../SHELL";


// TODO: Shell

const shellAPI = require("./api.shell");
const shellApp = require(SHELL)(shellAPI);


parentPort.on("message", (sReq: IRequest) => {
    parentPort.postMessage(shellApp(sReq));
});

parentPort.postMessage(true);   // Signal ready state