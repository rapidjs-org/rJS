import { EventEmitter } from "events";


const terminationEmitter: EventEmitter = new EventEmitter();


[ "SIGINT", "SIGTERM", "SIGQUIT", "SIGUSR1", "SIGUSR2" ]
.forEach(signal => {
	process.on(signal, (code: number) => process.exit(code));
});

[ "uncaughtException", "unhandledRejection" ]
.forEach(signal => {
	process.on(signal, (err: Error) => terminationEmitter.emit("uncaught", err));
});


process.on("exit", (code: number) => {
	terminationEmitter.emit("terminate", code);
});


export class InterruptionHandler {
	public static register(callback: (code?: number) => void) {
		terminationEmitter.on("terminate", callback);
	}
	public static registerUncaught(callback: (error?: Error) => void) {
		terminationEmitter.on("uncaught", callback);
	}
}