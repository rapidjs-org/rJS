import _config from "./_config.json";

process.title = `rJS ${_config.processTitle}`;


import { Socket } from "net";
import { IncomingMessage, ServerResponse } from "http";
import { createServer } from "https";
import { join } from "path";

import { IRequest } from "@rapidjs.org/rjs";

import { MultiMap } from "./MultiMap";
import { ProcessPool } from "./ProcessPool";


export interface IAppContext {
	hostnames: string|string[];
	workingDirPath: string;
}


// [ hostname: string ]: ProcessPool
const embeddedContexts: MultiMap<string, ProcessPool> = new MultiMap();


function embed(appContext: IAppContext): Promise<void> {
    return new Promise((resolve) => {
        const processPool: ProcessPool = new ProcessPool(
            join(__dirname, "../process/api.process"),
            appContext.workingDirPath
        )
        .once("online", resolve);
        
        embeddedContexts.set([ appContext.hostnames ].flat(), processPool);
    });
}

// TODO: Only start once (if is first)
function startServer() {
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
            // Multiplex, i.e. assign to respective process pool
            const requestedHostname: string = dReq.headers["host"].replace(/:\d+$/, "");
            //console.log(requestedHostname);
            if(!requestedHostname || !embeddedContexts.has(requestedHostname)) {
                dRes.statusCode = 400;
                dRes.end();

                return;
            }

            const sReq: IRequest = {
                method: dReq.method,
                url: dReq.url,
                headers: dReq.headers,
                body: body,
                clientIP: dReq.socket.remoteAddress
            };
            const socket: Socket = dReq.socket;
        })
        .catch((err: Error) => {
            dRes.statusCode = 500;
            dRes.end();
        });
    })
    .listen(443, () => {
        console.log("Proxy running.")
    });
}