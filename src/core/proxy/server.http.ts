/**
 * Module representing a custom HTTP server implementation
 * based on the core TCP server module. Favors reverse proxy
 * behavior due to directed socket distribution for worker
 * process internal closure.
 */


import { Socket } from "net";
import { join } from "path";

import { IBasicRequest } from "../../_interfaces";
import { EmbedContext } from "../EmbedContext";
import { HTTPServer } from "../HTTPServer";
import { ErrorControl } from "../ErrorControl";

import { MultiMap } from "./MultiMap";
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


/*
 * Catch any unhandled exception within this worker process
 * in order to prevent process termination, but simply handle
 * the error case for the respective request.
 */
new ErrorControl();

/*
 * Create the reverse proxying web server instance.
 */
new HTTPServer((iReq: IBasicRequest, socket: Socket) => {
    // Terminate socket handling if hostname is not registered
    // in proxy
    if(!contextPools.has(iReq.hostname)) {
        socket.end();
        socket.destroy();

        return;
    }
    
    // Assign the basic request alongside the socket connection
    // to the next worker handler candidate for hostname
    contextPools
    .get(iReq.hostname)
    .assign({
        iReq, socket
    });
}, eventuallyInitNotifyParent, err => {
    process.send(err.code);

    process.exit(0);
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

            if(contextPools.has(embedContext.hostnames)) return false;

            const processPool: ProcessPool = new ProcessPool(join(__dirname, "../process/api.process"), embedContext);
            
            processPool.init();

            processPool.on("terminate", () => {
                if(contextPools.size() > 1) return;

                process.exit(1);
            });
            
            contextPools.set(embedContext.hostnames, processPool);
            
            return true;
        }

        /*
         * Unbed a concrete hostname from the proxy and possibly the
         * associated concrete server application if is not referenced
         * by other hostnames.
         */
        case "unbed": {
            contextPools.delete(arg as (string|string[]));
            
            !contextPools.size()
            && setImmediate(() => process.exit(0));

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