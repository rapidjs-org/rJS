import { join } from "path";
import { Server, ServerOptions, RequestListener, IncomingMessage, ServerResponse, createServer as createHTTPServer } from "http";
import { createServer as createHTTPSServer } from "https";

import { ISpaceEnv } from "../interfaces";
import { respond } from "../respond";

import { ChildProcessPool } from "./ProcessPool";


process.on("uncaughtException", (err: Error) => {
    console.error(err);

    // TODO: Handle
});


const hostnameProcessPool: Map<string, ChildProcessPool> = new Map();
const commonServerOptions = {
    keepAlive: true // TODO: Optionalize?
};


export function bootReverseProxyServer(port: number, runSecure: boolean) {
    const createServer: (options: ServerOptions, requestListener?: RequestListener) => Server
    = runSecure
    ? createHTTPSServer
    : createHTTPServer;

    createServer({
        ...commonServerOptions,

        ...(runSecure ? {} : {}),  // TODO: TLS security (with periodical reloading)
    }, (dReq: IncomingMessage, dRes: ServerResponse) => {
        if(!dReq.headers["host"]) {
            respond(dRes, 422);

            return;
        }

        const relatedHostname: string = dReq.headers["host"].replace(/:[0-9]+$/, "");
        // TODO: Implement loose wildcard subdomain *.host.name?

        if(!hostnameProcessPool.has(relatedHostname)) {
            respond(dRes, 404);

            return;
        }
        
        hostnameProcessPool.get(relatedHostname)
        .assign(dRes.socket);
    }).listen(port, () => {
        // TODO: Notify up
    });

    // TODO: HTTP:80 to HTTPS:433 redirtection server?
    // TODO: Special case (default) for ports 80/433
}

export function embedSpace(spaceEnv: ISpaceEnv) {
    const processPool: ChildProcessPool = new ChildProcessPool(join(__dirname, "../process/server"), spaceEnv);

    processPool.init();

    const hostname: string = "localhost";
    
    hostnameProcessPool.set(hostname, processPool);
}