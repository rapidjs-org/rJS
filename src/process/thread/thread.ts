import { parentPort } from "worker_threads";

import { IRequest } from "../../interfaces";
import { SHELL } from "../../space/SHELL";


// TODO: Shell

const shellAPI = require("./api.shell");
const shellApp = require(SHELL)(shellAPI);    // TODO: Adapt


parentPort.on("message", (sReq: IRequest) => {
    parentPort.postMessage(shellApp(sReq));
});

// TODO: Clear ENV after has been parsed?

// TODO: Signal ready state?