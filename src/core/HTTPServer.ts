import { Socket } from "net";
import { Server, ServerOptions, RequestListener, IncomingMessage, createServer as createHTTPServer } from "http";
import { createServer as createHTTPSServer } from "https";

import { IBasicRequest } from "../_interfaces";

import { EmbedContext } from "./EmbedContext";


export class HTTPServer {

    constructor(requestHandlerCallback: (req: IBasicRequest, socket: Socket) => void, listensCallback?: () => void, errorCallback?: (err: { code: string }) => void) {
        const server: Server = ((EmbedContext.global.isSecure
        ? createHTTPSServer
        : createHTTPServer) as ((options: ServerOptions, requestListener?: RequestListener) => Server))
        ({   // TODO: Net instead?
            keepAlive: true,
            
            ...(EmbedContext.global.isSecure ? {} : {}),  // TODO: TLS security (with periodical reloading)
        }, (req: IncomingMessage) => {
            let hostname: string = [ req.headers["host"] ?? "localhost" ]
            .flat()[0]
            .replace(/:[0-9]+$/, "");
            
            const url: string = `http${EmbedContext.global.isSecure ? "s" : ""}://${hostname}:${EmbedContext.global.port}${req.url}`;
            
            const iReq: IBasicRequest = {
                headers: req.headers,
                hostname: hostname,
                method: req.method,
                url: url
            };
            
            requestHandlerCallback(iReq, req.socket);
        })
        .listen(EmbedContext.global.port, listensCallback);

        server.on("error", (err: { code: string }) => {
            errorCallback
            && errorCallback(err);

            console.error(`HTTP server error: ${err.code}`);
        })
    }

}