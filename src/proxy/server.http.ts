/**
 * Module representing a custom HTTP server implementation
 * based on the core TCP server module. Favors reverse proxy
 * behavior due to directed socket distribution for worker
 * process internal closure.
 */


import { join } from "path";
import { Socket } from "net";
import { Server, ServerOptions, RequestListener, createServer as createHTTPServer } from "http";
import { createServer as createHTTPSServer } from "https";

import { THeaders } from "../_types";
import { IBasicRequest } from "../_interfaces";

import { MultiMap } from "./MultiMap";
import { EmbedContext } from "./EmbedContext";
import { ProcessPool } from "./ProcessPool";
import { create as createUnixServer } from "./server.unix";


// TODO: Implement HTTP/2 option using proxy mastered streams?


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


process.on("uncaughtException", (err: Error) => {
    console.error(err); // TODO: Print

    // TODO: Handle
});


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
    /*
     * Handle TCP connections for HTTP syntactics. The reverse
     * proxy must not perform on any aditional request specific
     * information, but is designed for minimum distributional
     * handling functionality.
     */
    socket.once("readable", () => {
        // Read TCP request data into buffer for HTTP interpretation
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
        
        // Separate buffer into meta and header part
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

        // Extract approached hostname
        let hostname: string = [ headers["host"] ].flat()[0];
        
        // Terminate socket handling if hostname is not registered
        // in proxy
        if(!contextPools.has(hostname)) {
            socket.end();
            socket.destroy();

            return;
        }
        
        /* const httpVersion: string = meta[2].split("/")[1]; */

        // Extract request path to construct fully qualified URL
        const url: string = `http${EmbedContext.global.isSecure ? "s" : ""}://${hostname}${meta[1]}`;

        // Remove port from URL in case of explicit statement (known)
        hostname = hostname.replace(/:[0-9]+$/, "");
        
        // Construct basic-level request object containing minimum
        // relevant information for being send to a worker process
        const iReq: IBasicRequest = {
            method: meta[0],
            url: url,
            headers: headers
        };

        // Assign the basic request alongside the socket connection
        // to the next worker handler candidate for hostname
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
    // Differ socket request for proxy manipulation
    switch(command) {

        /*
         * Embed a concrete server application to the proxy associated
         * with a single or multiple ambiguous hostnames.
         */
        case "embed": {
            const embedContext: EmbedContext = new EmbedContext(arg as string[]);

            const processPool: ProcessPool = new ProcessPool(join(__dirname, "./process/api.process"), embedContext);

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


// TODO: HTTP:80 to HTTPS:433 redirection server?