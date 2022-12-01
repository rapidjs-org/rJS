import { join } from "path";
import { Socket } from "net";
import { Server, ServerOptions, RequestListener, createServer as createHTTPServer } from "http";
import { createServer as createHTTPSServer } from "https";

import { IIntermediateRequest, ISpaceEnv } from "../interfaces";
import { THeaders } from "../types";
import { Config } from "../Config";
import { RateLimiter } from "./RateLimiter";
import { respond } from "../respond";

import { ChildProcessPool } from "./ProcessPool";


process.on("uncaughtException", (err: Error) => {
    console.error(err);

    // TODO: Handle
});


const embeddedSpaces: Map<string, ChildProcessPool> = new Map();
const commonServerOptions = {
    keepAlive: true // TODO: Optionalize?
};


function handleSocket(socket: Socket) {
    let requestBuffer: string = "";

    let chunk: Buffer;
    let headersDelimiterIndex: number;

    while(chunk = socket.read()) {
        requestBuffer += chunk.toString();

        headersDelimiterIndex = requestBuffer.indexOf("\r\n\r\n");
        if(headersDelimiterIndex >= 0) {
            break;
        }
    }
    
    socket.unshift(requestBuffer.slice(headersDelimiterIndex + 4));
    
    const requestDataLines: string[] = requestBuffer
    .slice(0, headersDelimiterIndex)
    .split(/\r\n/g);

    const meta = requestDataLines
    .shift()
    .split(/ +/g);

    const headers: THeaders = {};
    requestDataLines
    .forEach((dataLine: string) => {
        const [ key, value ] = dataLine.split(":");
        
        headers[key.trim().toLowerCase()] = value.trim();
    });

    const iReq: IIntermediateRequest = {
        /* httpVersion: meta[2].split("/")[1], */
        method: meta[0],
        url: meta[1],
        headers: headers
    };
    
    const hostname: string = [ iReq.headers["host"] ].flat()[0]
    .replace(/:[0-9]+$/, "");   // Port is safe (known)    // TODO: Implement useful header manipulation interface

    if(!embeddedSpaces.has(hostname)) {
        respond(socket, 404);

        return;
    }
    
    embeddedSpaces.get(hostname)
    .assign({
        iReq, socket
    });
}


// TODO: Limiters here?
export function bootReverseProxyServer(port: number, runSecure: boolean) {
    const createServer: (options: ServerOptions, requestListener?: RequestListener) => Server
    = runSecure
    ? createHTTPSServer
    : createHTTPServer;

    createServer({
        ...commonServerOptions,

        ...(runSecure ? {} : {}),  // TODO: TLS security (with periodical reloading)
    })
    .on("connection", (socket: Socket) => {
        socket.once("readable", () => handleSocket(socket));
    })
    .listen(port, () => {
        // TODO: Notify up
    });

    // TODO: HTTP:80 to HTTPS:433 redirtection server?
    // TODO: Special case (default) for ports 80/433
}

export function embedSpace(spaceEnv: ISpaceEnv) {
    const processPool: ChildProcessPool = new ChildProcessPool(join(__dirname, "../process/server"), spaceEnv);

    processPool.init();

    // TODO: Retrieve related hostname via config
    //const spaceConfig: Config = new Config("...");

    embeddedSpaces.set("localhost", processPool);
}


// TODO: Remove DEV from ENV (and use specific dev server?); or keep for staging environments?