import { resolve, join } from "path";

import { IClusterConstraints } from "./local.interfaces";
import { Logger } from "./Logger";

import { Cluster } from "@rapidjs.org/handler-cluster";
import { IHandlerOptions } from "@rapidjs.org/rjs-handler";

import _config from "./_config.json";

export function createInstance(
    options?: Partial<IHandlerOptions>,
    clusterSize?: IClusterConstraints
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
        clusterConstraints?: IClusterConstraints
    ) {
        super(
            {
                modulePath: join(__dirname, "adapter"),
                options
            },
            {
                limit: options.dev ? 1 : (clusterConstraints ?? {}).processes
            },
            {
                limit: options.dev ? 1 : (clusterConstraints ?? {}).threads
            }
        );

        const logger: Logger = new Logger(
            resolve(options.cwd ?? process.cwd(), _config.logsDirName)
        );

        this.on("stdout", (message: string) => logger.info(message));
        this.on("stderr", (message: string) => logger.error(message));
    }
}
