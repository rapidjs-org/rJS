import { IncomingMessage, ServerResponse } from "http";
import { createServer as createHTTPSServer } from "https";
import { SecureContext, createSecureContext } from "tls";
import { existsSync, readFileSync } from "fs";
import { join, resolve as resolvePath } from "path";

import { IRequest, IResponse } from "@rapidjs.org/rjs";

import { DeferredCall } from "./.shared/DeferredCall";
import { MultiMap } from "./MultiMap";
import { ProcessPool } from "./ProcessPool";
import { IPCServer } from "./IPCServer";

import _config from "./_config.json";


// [ hostname: string ]: { … }
const embeddedContexts: MultiMap<string, {
    processPool: ProcessPool<IRequest, IResponse>;
    secureContext: SecureContext
}> = new MultiMap();


function embedContext(appContext: IAppContext): Promise<void> {
	return new Promise((resolve, reject) => {
		if(embeddedContexts.has(appContext.hostnames)) {
			reject(new RangeError("Hostname(s) already bound to proxy"));

			return;
		}

		const processPool = new ProcessPool<IRequest, IResponse>(
			join(__dirname, "./process/api.process"),
			appContext.workingDirPath,
			{
				DEV: appContext.devMode ? "1" : ""	// TODO: Test
			}
		)
        .once("online", resolve);
		
		const evalTLSArg = (arg: string|null) => {
			try {
				if(!arg) return null;
				if(!/\.(pem|key|ce?rt?)$/i.test(arg)) {
					return Buffer.from(arg, "utf8");
				}

				const path: string = resolvePath(appContext.workingDirPath, arg.toString())
				existsSync(path);
				return readFileSync(path);
			} catch {
				return arg;
			}
		};

		embeddedContexts.set([ appContext.hostnames ].flat(), {
			processPool,
			secureContext: createSecureContext({
				key: evalTLSArg(appContext.tls.key as string),
				cert: evalTLSArg(appContext.tls.cert as string),
				ca: (appContext.tls.ca ? [ appContext.tls.ca ].flat() : [])
					.map((ca: Buffer|string) => evalTLSArg(ca as string))
			}).context
		});
	});
}

function unbedContext(hostnames?: string|string[]): Promise<void> {
	return new Promise((resolve, reject) => {
		if(!hostnames) {
			resolve();

			setTimeout(() => process.exit(0));
		}

		if(!embeddedContexts.has(hostnames)) {
			reject(new RangeError("Unknown hostname(s)"));
            
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

function startServer(port: number): Promise<void> {
	process.title = `rJS ${_config.processTitle}`;

	return new Promise((resolve, reject) => {
		const onlineDeferral = new DeferredCall(resolve, 2);
		
		createHTTPSServer({
			SNICallback: (hostname: string, cb: (err: Error, ctx?: SecureContext) => void) => {    // TODO: Check hostname arg (syntax)
				return embeddedContexts.has(hostname)
					? cb(null, embeddedContexts.get(hostname).secureContext)
					: cb(null);	// Redirect?
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

            	embeddedContexts.get(requestedHostname)
                .processPool
                .assign(sReq)
				.then((sRes: IResponse) => {
					// Decode body
					sRes.body = sRes.body
					? Buffer.from(Object.values(sRes.body))
					: null;

					dRes.statusCode = sRes.status;
					Object.entries(sRes.headers)
					.forEach((header: [ string, string|(readonly string[]) ]) => {
						dRes.setHeader(header[0], header[1]);
					});
					
					dRes.end(sRes.body);
				});
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
        .registerCommand<void>("ping", () => {})
        .registerCommand<IAppContext>("embed", embedContext)
        .registerCommand<string|string[]>("unbed", unbedContext)
        .registerCommand<IMonitoring>("monitor", monitorProxy)
        .on("error", (err: Error) => reject(err));
	});
}


export interface IAppContext {
	hostnames: string|string[];
    tls: {
        key: Buffer|string;
        cert: Buffer|string;
        
        ca?: Buffer|string|(Buffer|string)[];
    };
	workingDirPath: string;

	devMode?: boolean;
}

export interface IMonitoring {
    proxiedHostnames: string[][];
}

export { SOCKET_DIR_PATH as SOCKET_LOCATION } from "./IPCServer";


export function embed(port: number, appContext: IAppContext): Promise<void> {
	// Start server once only if proxied context is first for the related port.
	// Maintain the server process and embed additional contexts via IPC.
	return new Promise((resolve, reject) => {
		const embedAppContext = () => {
			IPCServer.message<IAppContext, Promise<void>>(port, "embed", appContext)
			.then(resolve)
			.catch(reject);
		}
		
		IPCServer.message(port, "ping")
		.then(embedAppContext)
		.catch(async () => {	// Proxy server needs to be created first
			await startServer(port);
			
			embedAppContext();
		});
	});
}

export function unbed(port: number, hostnames?: string|string[]): Promise<void> {
	return new Promise((resolve, reject) => {
		IPCServer.message(port, "ping")
		.then(async () => {
			IPCServer.message<string|string[]|null>(port, "unbed", hostnames)
			.then(resolve)
			.catch(reject);
		})
		.catch(() => {
			reject(new ReferenceError("Unknown proxy."));
		});
	});
}

export function monitor(port: number) {
	return IPCServer.message<void, IMonitoring>(port, "monitor");
}

// TODO: Logs for proxy (besides individual apps)