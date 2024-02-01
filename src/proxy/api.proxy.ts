import { join } from "path";
import { Socket } from "net";
import { createServer } from "net";

import "./logs";
import { Context } from "../common/Context";
import { ProcessPool } from "./ProcessPool";

import __config from "../__config.json";


process.title = `${__config.appNameShort} proxy`;


const processPool: ProcessPool = new ProcessPool(join(__dirname, "../process/api.process"));

// TODO: Pool
// TODO: One core trap


process.on("exit", () => processPool.clear());
[ "SIGINT", "SIGTERM", "SIGQUIT", "SIGUSR1", "SIGUSR2", "uncaughtException" ]
.forEach(signal => {
	process.on(signal, (code: number) => {
		process.stdout.write("\n");
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
.listen(Context.CONFIG.get<number>("port"), () => {
	console.log(`Listening on #b{localhost}:${Context.CONFIG.get<number>("port")}`);
	(Context.MODE === "DEV")
	&& console.log(`Application runs #Br{${Context.MODE} mode}`);
});