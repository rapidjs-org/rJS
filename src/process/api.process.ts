import { join } from "path";
import { STATUS_CODES } from "http";
import { Socket } from "net";

import { ThreadPool } from "./ThreadPool";
import { IRequest, IResponse } from "./interfaces";
import { THeaders } from "./types";


const _config = {
    "httpVersion": "1.1"
};


const threadPool: ThreadPool = new ThreadPool(join(__dirname, "./thread/api.thread"));


process.on("message", (_, socket: Socket) => {
    socket.on("data", (data: Buffer) => {
        const message: string[] = String(data).split(/\n\s*\n/);
        const messageHead: string[] = message[0].trim().split(/\s*\n/g);
        const messageBody: string = message[1];

        const protocol: string[] = messageHead.shift().split(/\s+/g);
        const headers: THeaders = Object.fromEntries(
            messageHead
            .map((line: string) => line.split(/\s*:\s*/))
        );
        const method: string = protocol[0];
        const url: string = protocol[1];
        //const version: string = protocol[2];

        const sReq: IRequest = {
            method, url, headers,

            body: messageBody
        };

        // Assign accordingly prepared request data to worker thread
        threadPool.assign(sReq)
        .then((workerRes: IResponse) => {
            respond(socket, workerRes.status, workerRes.headers, workerRes.message);
        })
        .catch((err: Error) => {
            // TODO: Restart thread?
            
            respond(socket, 500, {});
        });
    });
});


function respond(socket: Socket, status: number, headers: THeaders, message?: unknown) {
    socket.write(`HTTP/${_config.httpVersion} ${status} ${STATUS_CODES[status]}\n`);
    socket.write(Object.entries(headers)
        .map((value: [ string, string ]) => `${value[0]}: ${value[1]}`)
        .join("\n")
    + "\n\n");
    socket.write(message ? message.toString() : "");
    
    socket.end();
}