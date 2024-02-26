import { join } from "path";
import { Socket, createServer } from "net";

import { IContextEmbed, IHTTPMessage, IProxyMonitor } from "../interfaces";
import { ProcessPool } from "./ProcessPool";
import { SocketResponder } from "../common/SocketResponder";
import { MultiMap } from "../common/MultiMap";
import { HTTPParser } from "./HTTPParser";
import { IPCServer } from "../common/IPCServer";
import { EventClassHandler } from "../common/EventClassHandler";
//import { RateLimiter } from "./RateLimiter";

import __config from "../__config.json";


process.title = `${__config.appNameShort} proxy`;


const META = {
	startTime: Date.now(),
	META.proxyPort: -1,
	isAlive: true
};


process.on("message", async (contextEmbed: IContextEmbed) => init(contextEmbed));	// TODO: Use generic communication model in detached mode instead

EventClassHandler.registerUncaught((err: Error) => {
	console.error(err);
});


//const rateLimiter: RateLimiter = new RateLimiter(Context.CONFIG.get<number>("maxClientRequests") || Infinity);
const contextProcessPools: MultiMap<string, ProcessPool> = new MultiMap();


function getEffectiveContextEmbed(contextEmbed: IContextEmbed): IContextEmbed {
	return {
		cwd: process.cwd(),
		args: process.argv.slice(2),
		port: contextEmbed.port ?? ((contextEmbed.protocol === "HTTPS") ? 443 : 80),
		protocol: "HTTP",
		hostnames: [ "localhost" ],
		clustered: true,

		...contextEmbed
	};
}

// TODO: Special case: Spin up HTTP(80) and HTTPS(443) together (?)
function initServer(port: number, enableProxyIPC: boolean): Promise<void> {
	EventClassHandler.register(() => {
		unbedContext([]);
		
		// TODO: Free SHM (termination listener)
	});

	return new Promise((resolve, reject) => {
		let requiredListenEvents = 1 + +enableProxyIPC;
		const tryResolve = () => {
			if(--requiredListenEvents) return;
			
			META.proxyPort = port;

			resolve();
		};
		
		enableProxyIPC
		&& new IPCServer(port, tryResolve)
		.registerCommand("unbed", async (hostnames: string[]) => {
			unbedContext(hostnames);
		})
		.registerCommand("embed", (contextEmbed: IContextEmbed) => {
			if(!META.isAlive) {
				throw new Error("Host application has stopped listening");	// TODO: Error log
			}
			return embedContext(contextEmbed);
		})
		.registerCommand("ping", () => {
			return ping();
		});
		
		// TODO: Server with variable TLS
		createServer({
			keepAlive: true
		})
		.on("connection", (socket: Socket) => {
			/* if(!rateLimiter.grantsAccess(socket.remoteAddress)) {
				socketRespond(socket, 429);
				
				return;
			} */
			socket.on("data", (data: Buffer) => {
				const httpMessage: IHTTPMessage = HTTPParser.parseBytes(data);
				const requestedHostname: string = httpMessage.headers["Host"];
				if(!contextProcessPools.has(requestedHostname)) {
					SocketResponder.respond(socket, 404);
					
					return;
				}	// TODO: Single app/core optimisations
				
				// Assign accordingly prepared request data to worker thread
				contextProcessPools.get(requestedHostname)
				.assign({
					message: httpMessage,
					socket: socket
				})
				.catch((err: Error) => {
					console.error(err);
				});
			});
		})
		.listen(port, tryResolve)
		.on("error", (err: Error & { code: string; }) => {
			if (err.code === "EADDRINUSE" || err.code === "EACCES") {
				reject(new Error("Port is unavailable"));

				return;
			}	
			
			reject(err);
		})
		.on("close", () => {
			META.isAlive = false;
		});
	});
}

function ping(): IProxyMonitor {
	return {
		isAlive: true,		// TODO
		pid: process.pid,
		port: META.proxyPort,
		hostnames: contextProcessPools.keys(),	// TODO: With cores (?)
		aliveTime: Date.now() - META.startTime
	};
}

function unbedContext(hostnames: string[]) {
	//require("fs").writeFileSync(__dirname+"/../../XXX.txt", (hostnames.length ? hostnames : contextProcessPools.keys()).toString());
	const unknownHostnames: string[] = hostnames
	.filter((hostname: string) => !contextProcessPools.keys().flat().includes(hostname));
	if(unknownHostnames.length) {
		throw new ReferenceError(`Host${
			(unknownHostnames.length > 1) ? "s" : ""
		} ${
			unknownHostnames
			.map((hostname: string) => `'${hostname}'`)
			.join(", ")
		} not known`);
	}

	(hostnames.length ? hostnames : contextProcessPools.keys())
	.forEach((hostnames: string|string[]) => {
		const processPool: ProcessPool = contextProcessPools.get(hostnames);
		!contextProcessPools.delete(hostnames)
		&& processPool.clear();
	});

	!contextProcessPools.size()
	&& setImmediate(() => process.exit(0));
}


export async function embedContext(contextEmbed: IContextEmbed): Promise<number> {
	const effectiveContextEmbed: IContextEmbed = getEffectiveContextEmbed(contextEmbed);
	// TODO: Update max cores based on last embedding?
	return new Promise((resolve, reject) => {
		const reusedHostnames: string[] = contextProcessPools.keys()
		.flat()
		.filter((hostname: string) => effectiveContextEmbed.hostnames.includes(hostname));
		if(reusedHostnames.length) {
			reject(new SyntaxError(`Host${
				(reusedHostnames.length > 1) ? "s" : ""
			} ${
				reusedHostnames
				.map((hostname: string) => `'${hostname}'`)
				.join(", ")
			} already used`));
						
			return;
		}

		const processPool: ProcessPool = new ProcessPool(
			join(__dirname, "../process/api.process"),
			effectiveContextEmbed.cwd,
			effectiveContextEmbed.args,
			+!effectiveContextEmbed.clustered
		)	// TODO: Differentiate base size and unclustered mode
		.once("online", () => {
			resolve(process.pid);
			try {
				process.send(process.pid);
			} catch {}
		});

		contextProcessPools.set(effectiveContextEmbed.hostnames, processPool);
	});
}

export async function init(contextEmbed: IContextEmbed, enableProxyIPC: boolean = true): Promise<number> {
	await initServer(getEffectiveContextEmbed(contextEmbed).port, enableProxyIPC);	// TODO: Separate server start and embed
	
	await embedContext(contextEmbed);

	return process.pid;
}

// TODO: Process downsizing antiproportional to apps