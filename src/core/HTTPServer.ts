// @ts-ignore
import { createCredentials } from "crypto";
import { readFileSync } from "fs";
import { Socket } from "net";
import { Server, ServerOptions, RequestListener, IncomingMessage, createServer as createHTTPServer } from "http";
import { createServer as createHTTPSServer } from "https";
import { join } from "path";

import { IBasicRequest } from "../_interfaces";

import { MultiMap } from "./MultiMap";
import { EmbedContext } from "./EmbedContext";
import { captionEffectiveHostnames } from "./utils";


export class HTTPServer {

    private readonly secureContexts: MultiMap<string, number> = new MultiMap();
    
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
        .listen(EmbedContext.global.port, () => {
            listensCallback();
            
            const modeDict = EmbedContext.global.mode as Record<string, boolean>;
            
            let runningMode: string;
            for(let mode in modeDict) {
                runningMode = mode;
                if(modeDict[mode]) break;
            }
            
            console.log(`Listening HTTP${EmbedContext.global.isSecure ? "S" : ""} at \x1b[36m${captionEffectiveHostnames()}\x1b[1m:${EmbedContext.global.port}\x1b[0m`);
            console.log(`Running \x1b[1m${EmbedContext.global.mode.DEV ? "\x1b[31m" : ""}${runningMode} MODE\x1b[0m`);
        });

        server.on("error", (err: { code: string }) => {
            errorCallback
            && errorCallback(err);

            console.error(`HTTP/TCP server startup error: ${err.code}`);
        })
    }

    private getSecureContext(hostname: string) {
        console.log((hostname))
        console.log(this.secureContexts.get(hostname))
        return this.secureContexts.get(hostname);
    }

    public setSecureContext(hostnames: string[], sslPath: string) {
        const keyPath: string = join(sslPath, "key.key");
        const certPath: string = join(sslPath, "cert.crt");
        const caPath: string = join(sslPath, "ca.crt"); // TODO: List(?)    // TODO: Allow custom names?
        
        console.log(hostnames)
        this.secureContexts
        .set(hostnames, createCredentials({
            key:  readFileSync(keyPath),
            cert: readFileSync(certPath),
            ca: [ caPath ]
                .flat()
                .map(path => readFileSync(path))
        }).context);
    }

    public removeSecureContext(hostnames: string|string[]) {
        this.secureContexts.delete(hostnames);
    }

}