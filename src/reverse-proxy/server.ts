import devConfig from "../_config.json";


import { join } from "path";
import { rmSync } from "fs";
import { Socket, createServer as createUnixSocketServer } from "net";
import { Server, ServerOptions, RequestListener, createServer as createHTTPServer } from "http";
import { createServer as createHTTPSServer } from "https";

import { IIntermediateRequest } from "../interfaces";
import { THeaders } from "../types";
import { DynamicResponse } from "../DynamicResponse";

import { ChildProcessPool } from "./ProcessPool";
import * as print from "./print";


// TODO: HTTP/2 with master streams


process.on("message", (message: string) => {
    const data: {
        port: number;
        shellApp: string;
        runSecure: boolean;
    } = JSON.parse(message);

    bootReverseProxyServer(data.port, data.shellApp, data.runSecure)
});


const embeddedSpaces: Map<string, ChildProcessPool> = new Map();

let activeShellApp: string;


function handleSocketConnection(socket: Socket, runSecure: boolean) {
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

    if(!embeddedSpaces.has(hostname)) {
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
    .get(hostname)
    .assign({
        iReq, socket
    });
}


// TODO: Limiters here?
export function bootReverseProxyServer(port: number, shellApp: string, runSecure: boolean) {  // TODO: Retireve object as IPC arg
    activeShellApp = shellApp;

    let remainingListeningEventsForBubbleup: number = 2;
    const bubbleUp = () => {
        (--remainingListeningEventsForBubbleup === 0)
        && process.send("listening");        // TODO: Notify up
    };

    const createWebServer: (options: ServerOptions, requestListener?: RequestListener) => Server
    = runSecure
    ? createHTTPSServer
    : createHTTPServer;

    createWebServer({
        keepAlive: true,

        ...(runSecure ? {} : {}),  // TODO: TLS security (with periodical reloading)
    })
    .on("connection", (socket: Socket) => {
        socket.once("readable", () => handleSocketConnection(socket, runSecure));
    })
    .once("error", (err: { code: string }) => {
        process.send(err.code);

        process.exit(0);

        // TODO: Recover?
    })
    .listen(port, bubbleUp);

    rmSync(`${devConfig.socketNamePrefix}${port}.sock`, {
        force: true
    });

    const unixSocketServer = createUnixSocketServer((stream) => {
        stream.on("data", (message: Buffer) => {
            const data: {
                command: string;
                arg: unknown;
            } = JSON.parse(message.toString());

            let respondSuccessful: boolean = true;

            switch(data.command) {

                case "shell_running":
                    respondSuccessful = (activeShellApp === data.arg);
                    break;

                case "port_available":
                    respondSuccessful = false;
                    break;

                case "hostname_available":
                    respondSuccessful = !embeddedSpaces.has(data.arg as string);
                    break;

                case "embed":
                    const processPool: ChildProcessPool = new ChildProcessPool(join(__dirname, "../process/process"), activeShellApp);

                    processPool.init();
                    
                    embeddedSpaces.set(data.arg as string, processPool);

                    break;

                case "unbed":
                    if(!embeddedSpaces.has(data.arg as string)) {
                        respondSuccessful = false;
                        break;
                    }

                    embeddedSpaces.delete(data.arg as string);

                    !embeddedSpaces.size
                    && process.exit(0);

                    break;

                default:
                    respondSuccessful = false;
                
            }

            stream.write(respondSuccessful ? "1" : "0");
        });
        // Do something with the client connection
    })
    .listen(`${devConfig.socketNamePrefix}${port}.sock`, bubbleUp);
    
    const cleanUpUnixSockets = (code: number) => {
        unixSocketServer.close();
        
        process.exit(code);
    };
    process.on("SIGINT", cleanUpUnixSockets);
    process.on("SIGTERM", cleanUpUnixSockets);
    process.on("exit", cleanUpUnixSockets);

    process.on("uncaughtException", (err: Error) => {
        console.error(err); // TODO: Print module

        // TODO: Handle
    });

    // TODO: Error handling

    // TODO: HTTP:80 to HTTPS:433 redirtection server?
}


// TODO: Remove DEV from ENV (and use specific dev server?); or keep for staging environments?