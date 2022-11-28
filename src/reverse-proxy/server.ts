import { resolve } from "path";
import { IncomingMessage, ServerResponse, createServer as createHTTPServer } from "http";
import { createServer as createHTTPSServer } from "https";

import { ISpaceEnv } from "../interfaces";

import { ChildProcessPool } from "./ProcessPool";


process.on("uncaughtException", (err: Error) => {
    console.error(err);

    // TODO: Handle
});


const hostnameProcessPool: Map<string, ChildProcessPool> = new Map();


// TODO: Get protocol once
createHTTPServer((dReq: IncomingMessage, dRes: ServerResponse) => {
    const relatedHostname: string = dReq.headers["host"].replace(/:[0-9]+$/, "");
    // TODO: Implement loose wildcard subdomain *.host.name?
    console.log(relatedHostname);

    const processPool: ChildProcessPool = hostnameProcessPool.get(relatedHostname);

    processPool.assign(dRes.socket);
}).listen(7070);


// TODO: HTTP:80 to HTTPS:433 redirtection server?


export function embedSpace(spaceEnv: ISpaceEnv) {
    const processPool: ChildProcessPool = new ChildProcessPool(resolve("../process/instance"), spaceEnv);

    processPool.init();

    const hostname: string = "localhost";
    
    hostnameProcessPool.set(hostname, processPool);
}