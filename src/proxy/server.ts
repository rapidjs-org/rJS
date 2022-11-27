import { join } from "path";
import { IncomingMessage, ServerResponse, createServer } from "http";

import { ChildProcessPool } from "./ProcessPool";


process.on("uncaughtException", (err: Error) => {
    console.error(err);

    // TODO: Handle
});


const processPool: ChildProcessPool = new ChildProcessPool(join(__dirname, "../process/instance"));

processPool.init();


createServer((dReq: IncomingMessage, dRes: ServerResponse) => {
    processPool.assign([
        reduceRequest(dReq),
        dRes.socket
    ]);
}).listen(7070);


function reduceRequest(dReq: IncomingMessage) {
    return { method: "GET", url: {}, headers: {} };
}