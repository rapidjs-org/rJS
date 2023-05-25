// @ts-ignore
import { createCredentials } from "crypto";
import { readFileSync } from "fs";
import { Socket } from "net";
import { Server, ServerOptions, RequestListener, IncomingMessage, createServer as createHTTPServer } from "http";
import { createServer as createHTTPSServer } from "https";

import { IBasicRequest } from "../_interfaces";

import { EmbedContext } from "./EmbedContext";


export class HTTPServer {

    private readonly secureContexts: Map<string, number> = new Map();
    
    constructor(requestHandlerCallback: (req: IBasicRequest, socket: Socket) => void, listensCallback?: () => void, errorCallback?: (err: { code: string }) => void) {
        EmbedContext.global.isSecure

        const server: Server = ((EmbedContext.global.isSecure
        ? createHTTPSServer
        : createHTTPServer) as ((options: ServerOptions, requestListener?: RequestListener) => Server))
        ({
            keepAlive: true,
            
            ...(EmbedContext.global.isSecure ? {
                SNICallback: (hostname: string) => {
                    return this.getSecureContext(hostname);
                }
            } : {}),
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
    
    private getSecureContext(hostname: string) {
        return this.secureContexts.get(hostname);
    }

    public setSecureContext(hostnames: string[], keyPath: string, certPath: string, caPath?: string|string[]) {
        hostnames
        .forEach((hostname: string) => {
            this.secureContexts
            .set(hostname, createCredentials({
                key:  readFileSync(keyPath),
                cert: readFileSync(certPath),
                ca: [ caPath ]
                    .flat()
                    .map(path => readFileSync(path))
            }).context);
        });
    }

    public removeSecureContext(hostnames: string|string[]) {
        [ hostnames ].flat()
        .forEach((hostname: string) => {
            this.secureContexts
            .delete(hostname);
        });
    }

}