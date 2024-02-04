import { join } from "path";
import { Socket } from "net";
import { createServer } from "net";

import { ProcessPool } from "./ProcessPool";
/* import { Context } from "../common/Context";
import { RateLimiter } from "./RateLimiter";
import { socketRespond } from "../common/socket-respond"; */

import __config from "../__config.json";


process.title = `${__config.appNameShort} proxy`;


//const rateLimiter: RateLimiter = new RateLimiter(Context.CONFIG.get<number>("maxClientRequests") || Infinity);

// TODO: Pool
// TODO: One core trap


[ "SIGINT", "SIGTERM", "SIGQUIT", "SIGUSR1", "SIGUSR2" ]
.forEach(signal => {
	process.on(signal, (code: number) => {
		process.exit(code);
	});
});


process.on("message", (message: string) => {
	const port: number = parseInt(message);

	if(isNaN(port)) throw new SyntaxError("Message to proxy process must be a valid port");

	start(port);

	// TODO: Disallow multiple server instances per proxy process?
});


export function start(port: number, singleCore: boolean = false): Promise<void> {
	return new Promise((resolve, reject) => {
		let requiredOnlineCalls: number = 2;
		const declareOnline = () => {
			if(--requiredOnlineCalls) return;

			resolve();
			
			process.send && process.send("online");
		};
		
		const processPool: ProcessPool = new ProcessPool(join(__dirname, "../process/api.process"), singleCore ? 1 : null)
		.on("online", declareOnline);
	
		const handleBubblingError = (err: Error) => {
			if(requiredOnlineCalls) {
				processPool.clear();
	
				throw err;
			}
			
			console.error(err);
		};
		process.on("uncaughtException", handleBubblingError);
		process.on("unhandledRejection", handleBubblingError);
	
		process.on("exit", () => processPool.clear());

		createServer({ pauseOnConnect: true })
		.on("connection", (socket: Socket) => {
			/* if(!rateLimiter.grantsAccess(socket.remoteAddress)) {
				socketRespond(socket, 429);
				
				return;
			} */

			// Assign accordingly prepared request data to worker thread
			processPool.assign(socket)
			.catch((err: Error) => {
				console.error(err);
			});
		})
		.listen(port, declareOnline)
		.on("error", (err: Error) => {
			reject(err);
		});
	});
}