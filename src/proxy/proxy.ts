import { join } from "path";
import { Socket } from "net";
import { Server, ServerOptions, RequestListener, createServer as createHTTPServer } from "http";
import { createServer as createHTTPSServer } from "https";

import { IEmbedEnv, IBareRequest } from "../_interfaces";
import { THeaders } from "../_types";
import { DynamicResponse } from "../DynamicResponse";

import { ProcessPool } from "./ProcessPool";
import { listenIPC } from "./ipc-target";


// TODO: HTTP/2 with master streams?


const embeddedSpaces: Map<string, ProcessPool> = new Map(); // TODO: Multiple hostnames for a single web spacw


process.on("message", (message: string) => {
    const activeEmbed: IEmbedEnv = JSON.parse(message);

    // TODO: Validate message

    startReverseProxyServer(activeEmbed);
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
    
    if(!embeddedSpaces.has(hostname)) {
        end(socket, 404);

        return;
    }

    const url: string = `http${runSecure ? "s" : ""}://${hostname}${meta[1]}`;

    hostname = hostname.replace(/:[0-9]+$/, "");   // Port is safe (known)    // TODO: Implement useful header manipulation interface
    
    const iReq: IBareRequest = {
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


export function startReverseProxyServer(activeEmbed: IEmbedEnv) {
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

    createWebServer({   // TODO: Net instead?
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
    .listen(activeEmbed.PORT, bubbleUp);

    listenIPC(activeEmbed.PORT, (command: string, arg: unknown) => {
        switch(command) {

            case "stop":
                setImmediate(() => process.exit(0));
                
                return true;
            
            case "retrieve_hostnames":
                return Array.from(embeddedSpaces.keys());
                
            case "shell_running":
                return activeEmbed.SHELL;

            case "hostname_available":  // TODO: Required? Perhaps combine with 'embed' IPC
                return !embeddedSpaces.has(arg as string);

            case "embed": {
                const activeEmbed = arg as IEmbedEnv;

                const processPool: ProcessPool = new ProcessPool(join(__dirname, "../process/process"), activeEmbed);

                processPool.init();
                
                embeddedSpaces.set(activeEmbed.HOSTNAME, processPool);
                
                return true;
            }
            case "unbed": {
                if(!embeddedSpaces.has(arg as string)) {
                    break;
                }

                embeddedSpaces.delete(arg as string);

                !embeddedSpaces.size
                && setImmediate(() => process.exit(0));
                
                return true;
            }
            
        }
    }, bubbleUp);
    
    process.on("uncaughtException", (err: Error) => {
        console.error(err); // TODO: Print module

        // TODO: Handle
    });

    // TODO: Error handling

    // TODO: HTTP:80 to HTTPS:433 redirtection server?
}