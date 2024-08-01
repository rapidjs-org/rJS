process.title = "rJS Reverse-proxy";


import { IncomingMessage, ServerResponse } from "http";
import { createServer } from "https";

import { ISerialRequest } from "@rapidjs.org/rjs";
import { Socket } from "net";


// TODO: Only start once (if is first)
createServer((dReq: IncomingMessage, dRes: ServerResponse) => {
    new Promise((resolve, reject) => {
        const body: string[] = [];
        dReq.on("readable", () => {
            body.push(dReq.read());
        });
        dReq.on("end", () => resolve(body.join("")));
        dReq.on("error", (err: Error) => reject(err));
    })
    .then((body: string) => {
        const sReq: ISerialRequest = {
            method: dReq.method,
            url: dReq.url,
            headers: dReq.headers,
            body: body,
            clientIP: dReq.socket.remoteAddress
        };
        const socket: Socket = dReq.socket;
        
        // TODO: Multiplex (find and assign proxy process)
    })
    .catch((err: Error) => {
        
    })
})
.listen(443, () => {
    console.log("Proxy running.")
});