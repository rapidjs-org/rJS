import { join } from "path";
import { Socket } from "net";
import { Server, ServerOptions, RequestListener, createServer as createHTTPServer } from "http";
import { createServer as createHTTPSServer } from "https";

import { THeaders } from "../_types";

import { MultiMap } from "./MultiMap";
import { EmbedContext } from "./EmbedContext";
import { ProcessPool } from "./ProcessPool";
import { create as createUnixServer } from "./server.unix";
import { IBasicRequest } from "../_interfaces";


// TODO: HTTP/2 with master streams?


/*
 * Parent process notification reference. Decrease after
 * each server { web, unix } initialization in order to
 * send notification to parent once the value is zero.
 */
let parentNotificationReference: number = 2;

/*
 * Map of embedded contexts ...
 */
const contextPools: MultiMap<string, ProcessPool> = new MultiMap();


/**
 * Notify parent process after initialization has completed.
 * Waits for all servers to have set up decreasing the
 * reference counter. Once zero the parent process is
 * notified sending a specific message code.
 */
function eventuallyInitNotifyParent() {
    (--parentNotificationReference === 0)
    && process.send("listening");        // TODO: Notify up
}


/*
 * Create the reverse proxying web server instance.
 */
((EmbedContext.global.isSecure
? createHTTPSServer
: createHTTPServer) as ((options: ServerOptions, requestListener?: RequestListener) => Server))
({   // TODO: Net instead?
    keepAlive: true,

    ...(EmbedContext.global.isSecure ? {} : {}),  // TODO: TLS security (with periodical reloading)
})
.on("connection", (socket: Socket) => {
    socket.once("readable", () => {
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
        
        if(!contextPools.has(hostname)) {
            socket.end();
            socket.destroy();

            return;
        }

        const url: string = `http${EmbedContext.global.isSecure ? "s" : ""}://${hostname}${meta[1]}`;

        hostname = hostname.replace(/:[0-9]+$/, "");   // Port is safe (known)    // TODO: Implement useful header manipulation interface
        
        const iReq: IBasicRequest = {
            /* httpVersion: meta[2].split("/")[1], */
            method: meta[0],
            url: url,
            headers: headers
        };

        contextPools
        .get(hostname)
        .assign({
            iReq, socket
        });
    });
})
.once("error", (err: { code: string }) => {
    process.send(err.code);

    process.exit(0);

    // TODO: Recover?
})
.listen(EmbedContext.global.port, eventuallyInitNotifyParent);

/*
 * Create the proxy inherent unix socket server for runtime
 * manipulation inter process communication.
 */
createUnixServer(EmbedContext.global.port, (command: string, arg: unknown) => {
    switch(command) {

        /*
         * Embed a concrete server application to the proxy associated
         * with a single or multiple ambiguous hostnames.
         */
        case "embed": {
            const embedContext: EmbedContext = new EmbedContext(arg as string[]);

            const processPool: ProcessPool = new ProcessPool(join(__dirname, "../process/process"), embedContext);

            processPool.init();
            
            contextPools.set(embedContext.hostnames, processPool);
            
            return true;
        }

        /*
         * Unbed a concrete hostname from the proxy and possibly the
         * associated concrete server application if is not referenced
         * by other hostnames.
         */
        case "unbed": {
            [ arg as string ].flat()
            .forEach((hostname: string) => {
                if(!contextPools.has(hostname)) return;
                
                contextPools.delete(arg as string);
    
                !contextPools.size()
                && setImmediate(() => process.exit(0));
            });
            
            return true;
        }
        
        /*
         * Stop proxy process.
         */
        case "stop":
            setImmediate(() => process.exit(0));
            
            return true;
        
        /*
         * Retrieve information about embedded concrete server
         * applications for monitoring purposes.
         */
        case "monitor":
            return contextPools.keys(); // TODO: Also record start date, etc.
        
    }
}, eventuallyInitNotifyParent);


process.on("uncaughtException", (err: Error) => {
    console.error(err); // TODO: Print

    // TODO: Handle
});

// TODO: HTTP:80 to HTTPS:433 redirection server?