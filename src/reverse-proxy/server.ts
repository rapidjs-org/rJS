import devConfig from "../dev-config.json";


import { join } from "path";
import { rmSync } from "fs";
import { Socket, createServer as createUnixSocketServer } from "net";
import { Server, ServerOptions, RequestListener, createServer as createHTTPServer } from "http";
import { createServer as createHTTPSServer } from "https";

import { IIntermediateRequest, ISpaceEnv } from "../interfaces";
import { THeaders } from "../types";
import { DynamicResponse } from "../DynamicResponse";

import { PATH } from "./PATH";
import { MODE } from "./MODE";
import { ChildProcessPool } from "./ProcessPool";
import * as print from "./print";
import { connectProxySocket } from "./conncect-proxy";


const cleanUpUnixSockets = (code: number) => {
    registeredUnixSocketServers
    .forEach((server: Server) => {
        server.close();
    });

    process.exit(code);
};
process.on("SIGINT", cleanUpUnixSockets);
process.on("SIGTERM", cleanUpUnixSockets);
process.on("exit", cleanUpUnixSockets);

process.on("uncaughtException", (err: Error) => {
    console.error(err);

    // TODO: Handle
});

// TODO: HTTP/2 with master streams


const registeredUnixSocketServers: Set<unknown> = new Set();
const embeddedSpaces: Map<string, ChildProcessPool> = new Map();


function handleSocketConnection(port: number, socket: Socket, runSecure: boolean) {
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

    let hostname: string = [ headers["host"] ].flat()[0];

    const url: string = `http${runSecure ? "s" : ""}://${hostname}${meta[1]}`;

    hostname = hostname.replace(/:[0-9]+$/, "");   // Port is safe (known)    // TODO: Implement useful header manipulation interface

    if(!embeddedSpaces.has(`${hostname}:${port}`)) {
        const dRes: DynamicResponse = new DynamicResponse(socket);
        
        dRes.statusCode = 404;
        dRes.end();

        return;
    }
    
    const iReq: IIntermediateRequest = {
        /* httpVersion: meta[2].split("/")[1], */
        method: meta[0],
        url: url,
        headers: headers
    };

    embeddedSpaces
    .get(`${hostname}:${port}`)
    .assign({
        iReq, socket
    });
}

// TODO: Limiters here?
function bootReverseProxyServer(port: number, runSecure: boolean) {
    const createWebServer: (options: ServerOptions, requestListener?: RequestListener) => Server
    = runSecure
    ? createHTTPSServer
    : createHTTPServer;

    createWebServer({
        keepAlive: true,

        ...(runSecure ? {} : {}),  // TODO: TLS security (with periodical reloading)
    })
    .on("connection", (socket: Socket) => {
        socket.once("readable", () => handleSocketConnection(port, socket, runSecure));
    })
    .listen(port, () => {
        print.info(`HTTP${runSecure ? "S": ""} server proxy started listening on :${port}`);  // TODO: Read port ()
        // TODO: Notify up
    });

    rmSync(`${devConfig.socketNamePrefix}${port}.sock`, {
        force: true
    });

    const unixSocketServer = createUnixSocketServer((stream) => {
        stream.on("data", (message: Buffer) => {
            const command: string = message.toString();
            
            switch(command) {
                case "status":
                    stream.write("OK"); // TODO: Implement
                    return;
                case "embed":
                    console.log("EMBED!");
                    stream.write("OK"); // TODO: Implement
                    return;
            }
        });
        // Do something with the client connection
    })
    .listen(`${devConfig.socketNamePrefix}${port}.sock`);
    
    registeredUnixSocketServers.add(unixSocketServer);

    // TODO: Error handling

    // TODO: HTTP:80 to HTTPS:433 redirtection server?
    // TODO: Special case (default) for ports 80/433
}


export function embedSpace() {
    // TODO: Port!!!
    const hostname: string = "localhost";   // TODO: Multiple
    const port: number = 7070;

    if(embeddedSpaces.has(`${hostname}:${port}`)) {
        print.error(`Address in use ${hostname}:${port}`);

        return;
    }

    // TODO: Boot if not yet running
    bootReverseProxyServer(port, false);


    connectProxySocket(port, "embed")
    .then(msg => console.log(msg));


    const spaceEnv: ISpaceEnv = {
        PATH: PATH,
        MODE: MODE
    };

    try {
        const processPool: ChildProcessPool = new ChildProcessPool(join(__dirname, "../process/process"), spaceEnv);

        processPool.init();

        // TODO: Retrieve related hostname via config
        // const spaceConfig: Config = new Config("...");

        embeddedSpaces.set(`${hostname}:${port}`, processPool);

        print.info(`Embedded application cluster at ${hostname}:${port}`);  // TODO: Read port ()
    } catch(err) {
        print.error(err.message);
    }
}


// TODO: Remove DEV from ENV (and use specific dev server?); or keep for staging environments?