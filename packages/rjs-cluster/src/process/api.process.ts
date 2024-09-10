import { Socket } from "net";
import { STATUS_CODES } from "http";

import { TSerializable, TStatus } from "../.shared/global.types";
import { ISerialRequest, ISerialResponse } from "../.shared/global.interfaces";
import { IAdapterConfiguration } from "../AWorkerCluster";
import { TAdapter, Adapter } from "../Adapter";


process.once("message", async (workerData: IAdapterConfiguration) => {
	function serializableToBuffer(serializable: TSerializable): Buffer {
		if(Buffer.isBuffer(serializable)) return serializable;
		if([ undefined, null ].includes(serializable)) return Buffer.from("");
		if(!(serializable instanceof Uint8Array)) return Buffer.from(serializable.toString());

		const buffer: Buffer = Buffer.alloc(serializable.byteLength);
		for(let i = 0; i < buffer.length; ++i) {
		  buffer[i] = serializable[i];
		}
		return buffer;
	};
	function writeResponse(sResPartial: Partial<ISerialResponse>, socket?: Socket) {
		if(!socket) return sResPartial;
		
		const status: TStatus = sResPartial.status ?? 500;
		const data: (string|Buffer)[] = [];
		data.push(`HTTP/1.1 ${status} ${STATUS_CODES[status]}`);
		data.push(
			...Object.entries(sResPartial.headers ?? {})
			.map((entry: [ string, string|readonly string[] ]) => `${entry[0]}: ${entry[1]}`)
		);
		data.push(...[ "", "" ]);
		
		socket.write(Buffer.concat([
			Buffer.from(data.join("\r\n")),
			serializableToBuffer(sResPartial.body)
		]), (err?: Error) => {
			/* !bufferedBody.byteLength */
			/* && socket.end(() => this.socket.destroy()); */
			if(err) throw err;
		});
		
		return sResPartial;
	}
	
	new Adapter(workerData.modulePath, workerData.options)
	.loadHandler()
	.then(async (handler: TAdapter) => {
		process.on("message", async (sReq: ISerialRequest, socket?: Socket) => {
			try {
				process.send(writeResponse(await handler(sReq), socket));
			} catch(err) {
				writeResponse({
					status: isNaN(err) ? 500 : err
				});

				if(isNaN(err)) throw err;
			}
		});
		
		process.send("online");
	});
});