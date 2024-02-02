import { join } from "path";
import { Socket } from "net";
import { createServer } from "net";
import { EventEmitter } from "events";

import "./format-file-logs";
import { Context } from "../common/Context";
import { ProcessPool } from "./ProcessPool";

import __config from "../__config.json";


process.title = `${__config.appNameShort} proxy`;


const eventEmitter: EventEmitter = new EventEmitter();
const processPool: ProcessPool = new ProcessPool(join(__dirname, "../process/api.process"))
.on("online", online);

// TODO: Pool
// TODO: One core trap


process.on("exit", () => processPool.clear());
[ "SIGINT", "SIGTERM", "SIGQUIT", "SIGUSR1", "SIGUSR2", "uncaughtException" ]
.forEach(signal => {
	process.on(signal, (code: number) => {
		process.exit(code);
	});
});


createServer({ pauseOnConnect: true })
.on("connection", (socket: Socket) => {
	// Assign accordingly prepared request data to worker thread
	processPool.assign(socket)
	.catch((err: Error) => {
		console.error(err);
	});
})
.listen(Context.CONFIG.get<number>("port"), online);


let requiredOnlineCalls: number = 2;
function online() {
	if(--requiredOnlineCalls) return;

	eventEmitter.emit("online");
}


export default eventEmitter;