import { resolve, join } from "path";

import { TJSON } from "./.shared/global.types";
import { ISerialRequest, ISerialResponse } from "./.shared/global.interfaces";
import { IClusterConstraints } from "./local.interfaces";
import { Logger } from "./Logger";

import { Cluster } from "@rapidjs.org/cluster";
import { IHandlerEnv } from "@rapidjs.org/rjs-handler";

import _config from "./_config.json";

export function createInstance(
    env?: Partial<IHandlerEnv>,
    options?: TJSON,
    clusterSize?: IClusterConstraints
): Promise<Instance> {
    return new Promise((resolve) => {
        const instance: Instance = new Instance(env, options, clusterSize).on(
            "online",
            () => resolve(instance)
        );
    });
}

export class Instance extends Cluster<ISerialRequest, ISerialResponse> {
    constructor(
        env?: Partial<IHandlerEnv>,
        options?: TJSON,
        clusterConstraints?: IClusterConstraints
    ) {
        super(
            {
                modulePath: join(__dirname, "adapter"),
                options: {
                    env,
                    options
                }
            },
            {
                limit: env.dev ? 1 : (clusterConstraints ?? {}).processes
            },
            {
                limit: env.dev ? 1 : (clusterConstraints ?? {}).threads
            }
        );

        const logger: Logger = new Logger(
            resolve(env.cwd ?? process.cwd(), _config.logsDirName)
        );

        this.on("stdout", (message: string) => logger.info(message));
        this.on("stderr", (message: string) => logger.error(message));
    }
}
