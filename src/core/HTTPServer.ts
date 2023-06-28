import { readFileSync } from "fs";
import { Socket } from "net";
import { Server, ServerOptions, RequestListener, IncomingMessage, ServerResponse, createServer as createHTTPServer } from "http";
import { createServer as createHTTPSServer } from "https";
import { SecureContext, createSecureContext } from "tls";
import { join } from "path";

import { IBasicRequest } from "../interfaces";

import { MultiMap } from "./MultiMap";
import { EmbedContext } from "../EmbedContext";


export class HTTPServer {

	public static captionEffectiveHostnames(): string {
		return `${
			EmbedContext.global.hostnames[0]
		}${(
			EmbedContext.global.hostnames.length > 1)
			? ` (+${EmbedContext.global.hostnames.length - 1})`
			: ""
		}`;
	}

    private readonly secureContexts: MultiMap<string, SecureContext> = new MultiMap();
    
    constructor(requestHandlerCallback: (req: IBasicRequest, socket: Socket) => void, listensCallback?: () => void, errorCallback?: (err: { code: string }) => void) {
    	EmbedContext.global.isSecure;

    	const server: Server = ((EmbedContext.global.isSecure
    		? createHTTPSServer
    		: createHTTPServer) as ((options: ServerOptions, requestListener?: RequestListener) => Server))(
    		{
    		keepAlive: true,
            
    		...(EmbedContext.global.isSecure ? {
    			SNICallback: (hostname: string) => {
    				return this.getSecureContext(hostname);
    			}
    		} : {}),
    	}, (req: IncomingMessage, res: ServerResponse) => {
    		try {
    			const hostname: string = [ req.headers["host"] ?? "localhost" ]
    			.flat()[0]
    			.replace(/:[0-9]+$/, "");
    			const url = `http${EmbedContext.global.isSecure ? "s" : ""}://${hostname}:${EmbedContext.global.port}${req.url}`;
                
				var bodyChunks: string[] = [];
				req.on("readable", function() {
					bodyChunks.push(req.read());
				});
				req.on("end", function() {
					let body: unknown;
					try {
						body = JSON.parse(bodyChunks.join(""));
					} catch {
						body = bodyChunks.join("");
					}

					const iReq: IBasicRequest = {
						headers: req.headers,
						hostname: hostname,
						method: req.method,
						url: url,
						body: body
					};
					
					requestHandlerCallback(iReq, req.socket);
				});
    		} catch(err) {
    			res.statusCode = 500;
    			res.end();
                
    			throw err;
    		}
    	})
    	.listen(EmbedContext.global.port, () => {
    		listensCallback();
            
    		const modeDict = EmbedContext.global.mode as unknown as Record<string, boolean>;
            
    		let runningMode: string;
    		for(const mode in modeDict) {
    			runningMode = mode;
    			if(modeDict[mode]) break;
    		}
            
    		console.log(`Listening HTTP${EmbedContext.global.isSecure ? "S" : ""} at \x1b[36m${HTTPServer.captionEffectiveHostnames()}\x1b[1m:${EmbedContext.global.port}\x1b[0m`);
    		console.log(`Running \x1b[1m${EmbedContext.global.mode.DEV ? "\x1b[31m" : ""}${runningMode} MODE\x1b[0m`);
    	});
        
    	server.on("error", (err: { code: string }) => {
    		errorCallback
            && errorCallback(err);

    		throw new Error(`HTTP/TCP server startup error: ${err.code}`);
    	});
    }

    public setSecureContext(hostnames: string[], sslPath: string) {
    	const keyPath: string = join(sslPath, "key.pem");
    	const certPath: string = join(sslPath, "cert.pem");
    	const caPath: string = join(sslPath, "ca.crt"); // TODO: List(?)    // TODO: Allow custom names?
        
    	// TODO: Cert passphrases?
    	this.secureContexts
    	.set(hostnames, createSecureContext({
    		key:  readFileSync(keyPath),
    		cert: readFileSync(certPath),
    		/* ca: [ caPath ]
                .flat()
                .map(path => readFileSync(path)) */
    	}).context);
    }

    private getSecureContext(hostname: string): SecureContext {
    	return this.secureContexts.get(hostname);
    }

    public removeSecureContext(hostnames: string|string[]) {
    	this.secureContexts.delete(hostnames);
    }

}