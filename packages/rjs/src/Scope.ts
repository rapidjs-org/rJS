import { EventEmitter } from "events";
import { Socket } from "net";

import { ISerialRequest, ISerialResponse } from "./.shared/global.interfaces";

import { ICoreOptions, Core } from "@rapidjs.org/rjs-core";
import { Cluster } from "@rapidjs.org/rjs-cluster";
import { join } from "path";


export class Scope extends EventEmitter {
	private readonly cluster: Cluster;

	constructor(options: Partial<ICoreOptions> = {}) {
		super();

		const optionsWithDefaults: ICoreOptions = Core.optionsWithDefaults(options);
		
		this.cluster = new Cluster({
			modulePath: join(__dirname, "./adapter"),
			options
		}, {
			baseSize: optionsWithDefaults.dev ? 1 : undefined,
			logsDirPath: optionsWithDefaults.cwd
		})
		.once("online", () => this.emit("online"));
	}	

	public async handleRequest(sReq: ISerialRequest, socket?: Socket): Promise<ISerialResponse> {	// TODO: IncomingMessage object overload?
		return this.cluster.handleRequest(sReq as ISerialRequest, socket);
	}

	public destroy() {
		this.cluster.destroy();
	}
}