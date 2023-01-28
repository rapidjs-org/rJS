import { parentPort } from "worker_threads";

import { IRequest } from "../_interfaces";
import { SHELL } from "../bin/SHELL";


// TODO: Shell

const shellAPI = require("./api.shell");
const shellApp = require(SHELL)(shellAPI);


parentPort.on("message", (sReq: IRequest) => {
    parentPort.postMessage(shellApp(sReq));
});

parentPort.postMessage(true);   // Signal ready state