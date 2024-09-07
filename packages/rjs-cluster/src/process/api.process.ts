import { Socket } from "net";
import { STATUS_CODES } from "http";

import { TStatus } from "../.shared/global.types";
import { ISerialRequest, ISerialResponse } from "../.shared/global.interfaces";
import { Logger } from "../.shared/Logger";
import { IAdapterOptions, IWorkerPoolOptions } from "../AWorkerPool";
import { ThreadPool } from "../thread/ThreadPool";
import { writeFileSync } from "fs";
import { join } from "path";


process.once("message", async (workerData: {
	workerPoolOptions: IWorkerPoolOptions;
	adapterOptions: IAdapterOptions;
}) => {
    writeFileSync(join(__dirname, "debug.txt"), "a");
	const logger: Logger|null = workerData.workerPoolOptions.logsDirPath
	? new Logger(Logger.defaultPath(workerData.workerPoolOptions.logsDirPath))
	: null;
	const threadPool: ThreadPool = new ThreadPool({
		modulePath: workerData.adapterOptions.modulePath,
		options: workerData.adapterOptions.options
	}, workerData.workerPoolOptions);

	process.on("message", async (sReq: ISerialRequest, socket?: Socket) => {
		let sResPartial: Partial<ISerialResponse>;
		try {
			sResPartial = await threadPool.assign(sReq);
		} catch(err) {
			logger && logger.error(err);
			
			sResPartial = { status: 500 };
		}
		
		process.send(writeResponse(sResPartial, socket));
	});

	process.send("online");
});

function makeResponse(sResPartial: Partial<ISerialResponse>): ISerialResponse {
	return {
		status: 200,
		headers: {},
		
		...sResPartial
	};
}

function writeResponse(sResPartial: Partial<ISerialResponse>, socket?: Socket): ISerialResponse {
	if(!socket) return makeResponse(sResPartial);

	const status: TStatus = sResPartial.status ?? 500;
	const data: (string|Buffer)[] = [];
	data.push(`HTTP/1.1 ${status} ${STATUS_CODES[status]}`);
	data.push(
		...Object.entries(sResPartial.headers ?? {})
		.map((entry: [ string, string|readonly string[] ]) => `${entry[0]}: ${entry[1]}`)
	);
	data.push(...[ "", "" ]);
	
	const bufferedBody: Buffer = sResPartial.body
	? (!Buffer.isBuffer(sResPartial.body)
		? Buffer.from(sResPartial.body.toString())
		: sResPartial.body)
	: Buffer.from("");

	socket.write(Buffer.concat([
		Buffer.from(data.join("\r\n")),
		bufferedBody
	]), (err?: Error) => {
		err && console.error(err);  // TODO: Log
	});
	
	!bufferedBody.byteLength
	&& socket.end(() => this.socket.destroy());
	
	return makeResponse(sResPartial);
}