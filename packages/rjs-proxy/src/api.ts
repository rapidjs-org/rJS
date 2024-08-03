import _config from "./_config.json";

process.title = `rJS ${_config.processTitle}`;


import { IncomingMessage, ServerResponse } from "http";
import { createServer as createHTTPSServer } from "https";
import { SecureContext, createSecureContext } from "tls";
import { Socket } from "net";
import { readFileSync } from "fs";
import { join } from "path";

import { IRequest } from "@rapidjs.org/rjs";

import { DeferredCall } from "./.shared/DeferredCall";
import { MultiMap } from "./MultiMap";
import { ProcessPool } from "./ProcessPool";
import { IPCServer } from "./IPCServer";


// [ hostname: string ]: ProcessPool
const embeddedContexts: MultiMap<string, {
    processPool: ProcessPool;
    secureContext: SecureContext
}> = new MultiMap();


function startServer(port: number): Promise<void> {
	return new Promise((resolve, reject) => {
		const onlineDeferral = new DeferredCall(resolve, 2);
        
		createHTTPSServer({
			SNICallback: (hostname: string, cb: (err: Error, ctx?: SecureContext) => void) => {    // TODO: Check hostname arg (syntax)
				return embeddedContexts.has(hostname)
					? cb(null, embeddedContexts.get(hostname).secureContext)
					: cb(null);
			}
		}, (dReq: IncomingMessage, dRes: ServerResponse) => {
			new Promise((resolve, reject) => {
				const body: string[] = [];
				dReq.on("readable", () => {
					body.push(dReq.read());
				});
				dReq.on("end", () => resolve(body.join("")));
				dReq.on("error", (err: Error) => reject(err));
			})
            .then((body: string) => {
            	// Multiplex, i.e. assign to respective process pool
            	const requestedHostname: string = dReq.headers["host"].replace(/:\d+$/, "");
            	//console.log(requestedHostname);
            	if(!requestedHostname || !embeddedContexts.has(requestedHostname)) {
            		dRes.statusCode = 400;
            		dRes.end();

            		return;
            	}

            	const sReq: IRequest = {
            		method: dReq.method,
            		url: dReq.url,
            		headers: dReq.headers,
            		body: body,
            		clientIP: dReq.socket.remoteAddress
            	};
            	const socket: Socket = dReq.socket;

            	embeddedContexts.get(requestedHostname)
                .processPool
                .assign({ sReq, socket });
            })
            .catch((err: Error) => {
            	dRes.statusCode = 500;
            	dRes.end();

            	console.error(err);
            });
		})
        .listen(port, () => onlineDeferral.call())
        .on("error", (err: Error) => reject(err));

		new IPCServer(port)
        .listen(() => onlineDeferral.call())
        .registerCommand<IAppContext>("embed", embedContext)
        .registerCommand<string|string[]>("unbed", unbedContext)
        .registerCommand<IMonitoring>("monitor", monitorProxy)
        .on("error", (err: Error) => reject(err));
	});
}

function embedContext(appContext: IAppContext): Promise<void> {
	return new Promise((resolve) => {
		const processPool: ProcessPool = new ProcessPool(
			join(__dirname, "../process/api.process"),
			appContext.workingDirPath
		)
        .once("online", resolve);
        
		const evalTLSArg = (arg: Buffer|string) => {
			return arg; // TODO: Read if is path; with periodic refresh (daily?)
		};
		embeddedContexts.set([ appContext.hostnames ].flat(), {
			processPool,
			secureContext: createSecureContext({
				key: evalTLSArg(appContext.tls.key),
				cert: evalTLSArg(appContext.tls.cert),
				ca: [ appContext.tls.ca ].flat().map((ca: Buffer|string) => evalTLSArg(ca))
			}).context
		});
	});
}

function unbedContext(hostnames: string|string[]): Promise<void> {
	return new Promise((resolve, reject) => {
		if(!embeddedContexts.has(hostnames)) {
			reject();
            
			return;
		}

		embeddedContexts.get(hostnames)
        .processPool
        .clear();
		embeddedContexts.delete(hostnames);

		resolve();
	});
}

function monitorProxy(): IMonitoring {
    return {
        proxiedHostnames: embeddedContexts.keys()
    };
}


export interface IAppContext {
	hostnames: string|string[];
    tls: {
        key: Buffer|string;
        cert: Buffer|string;
        
        ca?: Buffer|string|(Buffer|string)[];
    };
	workingDirPath: string;
}

export interface IMonitoring {
    proxiedHostnames: string[][];
}


export function embed(port: number, appContext: IAppContext): Promise<void> {
	// Start server once only if proxied context is first for the related port.
	// Maintain the server process and embed additional contexts via IPC.
    
	return new Promise((resolve) => {
		IPCServer.message(port, null, null)
        .catch(async () => {    // Proxy process needs to be created first
        	await startServer(port);

        	resolve();
        })
        .finally(() =>  IPCServer.message<IAppContext>(port, "embed", appContext));
	});
}

export function unbed(port: number, hostnames: string|string[]): Promise<void> {
	return IPCServer.message<string|string[]>(port, "unbed", hostnames);
}

export function monitor(port: number) {
	return IPCServer.message<void, IMonitoring>(port, "monitor");
}