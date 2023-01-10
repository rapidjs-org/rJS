import { join } from "path";
import { rmSync } from "fs";
import { Socket, createServer as createUnixSocketServer } from "net";
import { Server, ServerOptions, RequestListener, createServer as createHTTPServer } from "http";
import { createServer as createHTTPSServer } from "https";

import { IIntermediateRequest } from "../interfaces";
import { THeaders } from "../types";
import { DynamicResponse } from "../DynamicResponse";
import { MODE } from "../space/MODE";
import { SHELL } from "../space/SHELL";
import { CONFIG } from "../space/CONFIG";

import { ProcessPool } from "./ProcessPool";
import { RateLimiter } from "./RateLimiter";
import { locateSocket } from "./locate-socket";
import { PORT } from "./PORT";


// TODO: HTTP/2 with master streams


interface ISpaceEmbed {
    processPool: ProcessPool;
    rateLimiter: RateLimiter<string>;
}


const embeddedSpaces: Map<string, ISpaceEmbed> = new Map(); // TODO: Multiple hostnames for a single web spacw


process.on("message", (message: string) => {
    if(message !== "start") return;

    startReverseProxyServer()
});


function end(socket: Socket, status: number) {
    const dRes: DynamicResponse = new DynamicResponse(socket);
    
    dRes.statusCode = status;
    dRes.end();
}

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
    
    const clientIP: string = socket.remoteAddress;
    
    if(!embeddedSpaces.has(hostname)) {
        end(socket, 404);

        return;
    }

    const effectiveSpace = embeddedSpaces
    .get(hostname);

    if(!effectiveSpace.rateLimiter.grantsAccess(clientIP)) {
        end(socket, 429);
        
        return;
    }

    const url: string = `http${runSecure ? "s" : ""}://${hostname}${meta[1]}`;

    hostname = hostname.replace(/:[0-9]+$/, "");   // Port is safe (known)    // TODO: Implement useful header manipulation interface
    
    const iReq: IIntermediateRequest = {
        /* httpVersion: meta[2].split("/")[1], */
        method: meta[0],
        url: url,
        headers: headers
    };

    effectiveSpace
    .processPool
    .assign({
        iReq, socket
    });
}

// TODO: Limiters here?
export function startReverseProxyServer() {  // TODO: Retireve object as IPC arg
    let remainingListeningEventsForBubbleup: number = 2;
    const bubbleUp = () => {
        (--remainingListeningEventsForBubbleup === 0)
        && process.send("listening");        // TODO: Notify up
    };

    const runSecure: boolean = false;   // TODO: From host or option

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
    .listen(PORT, bubbleUp);

    rmSync(locateSocket(), {
        force: true
    });

    const unixSocketServer = createUnixSocketServer((socket: Socket) => {
        socket.on("data", (message: Buffer) => {
            const data: {
                command: string;
                arg: string;
            } = JSON.parse(message.toString());

            let response: unknown = false;

            switch(data.command) {

                case "shell_running":
                    response = SHELL
                    .match(/(\/)?(@?[a-z0-9_-]+\/)?[a-z0-9_-]+$/i)[0]
                    .replace(/^\//, ".../");

                    break;

                case "PORT_available":
                    response = false;

                    break;

                case "hostname_available":
                    response = !embeddedSpaces.has(data.arg);
                    
                    break;

                case "embed":
                    const processPool: ProcessPool = new ProcessPool(join(__dirname, "../process/process"));

                    processPool.init();
                    
                    embeddedSpaces.set(data.arg, {
                        processPool,
                        rateLimiter: new RateLimiter(MODE.DEV ? Infinity : CONFIG.data.limit.requestsPerClient)
                    });
                    
                    response = true;

                    break;

                case "unbed":
                    if(!embeddedSpaces.has(data.arg)) {
                        break;
                    }

                    embeddedSpaces.delete(data.arg);

                    !embeddedSpaces.size
                    && setImmediate(() => process.exit(0));
                    
                    response = true;

                    break;
                
                case "stop":
                    setImmediate(() => process.exit(0));
                    
                    response = true;

                    break;
                
                case "retrieve_hostnames":
                    response = Array.from(embeddedSpaces.keys());

                    break;
                
            }
            
            socket.write(JSON.stringify(response ?? false));

            socket.destroy();
        });
    })
    .listen(locateSocket(), bubbleUp);
    
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