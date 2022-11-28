import { parentPort } from "worker_threads";

import { IRequest } from "../../interfaces";


parentPort.on("message", (sReq: IRequest) => {
    parentPort.postMessage({
        message: "Hello world!"
    });
});

// TODO: Clear ENV after has been parsed?