import { Socket } from "net";
import { Server, ServerOptions, RequestListener, createServer as createHTTPServer } from "http";
import { createServer as createHTTPSServer } from "https";

import { THeaders } from "./_types";
import { IBasicRequest } from "./_interfaces";
import { EmbedContext } from "./EmbedContext";


export class HTTPServer {

    constructor(requestHandlerCallback: (req: IBasicRequest, socket: Socket) => void, listensCallback?: () => void) {
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
                let hostname: string = [ headers["host"] ]
                .flat()[0]
                .replace(/:[0-9]+$/, "");
                
                /* const httpVersion: string = meta[2].split("/")[1]; */
        
                // Extract request path to construct fully qualified URL
                const url: string = `http${EmbedContext.global.isSecure ? "s" : ""}://${hostname}${meta[1]}`;
                
                // Construct basic-level request object containing minimum
                // relevant information for being send to a worker process
                const iReq: IBasicRequest = {
                    headers: headers,
                    hostname: hostname,
                    method: meta[0],
                    url: url
                };

                requestHandlerCallback(iReq, socket);
            });
        })
        .once("error", (err: { code: string }) => {
            process.send(err.code);
        
            process.exit(0);
        
            // TODO: Recover?
        })
        .listen(EmbedContext.global.port, listensCallback);
    }

}