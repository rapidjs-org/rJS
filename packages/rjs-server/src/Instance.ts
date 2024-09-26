import { resolve, join } from "path";

import { IClusterSize } from "./local.interfaces";
import { Logger } from "./Logger";

import { Cluster } from "@rapidjs.org/server-cluster";
import { IHandlerOptions } from "@rapidjs.org/rjs-handler";

import _config from "./_config.json";

export function createInstance(
	options?: Partial<IHandlerOptions>,
	clusterSize?: IClusterSize
): Promise<Instance> {
	return new Promise((resolve) => {
		const instance: Instance = new Instance(options, clusterSize).on(
			"online",
			() => resolve(instance)
		);
	});
}

export class Instance extends Cluster {
	constructor(
		options?: Partial<IHandlerOptions>,
		clusterSize?: IClusterSize
	) {
		super(
			{
				modulePath: join(__dirname, "adapter"),
				options
			},
			{
				baseSize: options.dev ? 1 : (clusterSize ?? {}).processes
			},
			{
				baseSize: options.dev ? 1 : (clusterSize ?? {}).threads
			}
		);

		const logger: Logger = new Logger(
			resolve(options.cwd ?? process.cwd(), _config.logsDirName)
		);
        
		this.on("stdout", (message: string) => logger.info(message));
		this.on("stderr", (message: string) => logger.error(message));
	}
}
