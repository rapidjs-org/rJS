import { EventEmitter } from "events";
import {
    IncomingMessage,
    ServerResponse,
    createServer as createHTTPServer
} from "http";
import { createServer as createHTTPSServer } from "https";
import { resolve } from "path";
import { existsSync, readFileSync } from "fs";

import { THTTPMethod, TJSON, TStatus } from "./.shared/global.types";
import { ISerialRequest, ISerialResponse } from "./.shared/global.interfaces";
import { IClusterConstraints } from "./local.interfaces";
import { DeferredCall } from "./DeferredCall";
import { Logger } from "./Logger";
import { Instance } from "./Instance";

import { IHandlerEnv } from "@rapidjs.org/rjs-handler";

export interface IServerEnv extends IHandlerEnv {
    port: number;

    tls?: {
        cert: string | Buffer;
        key: string | Buffer;

        ca?: (string | Buffer)[];
    };
}

export function createServer(
    env: IServerEnv,
    options?: TJSON,
    clusterSize?: IClusterConstraints
): Promise<Server> {
    return new Promise((resolve) => {
        const server: Server = new Server(env, options, clusterSize).on(
            "online",
            () => resolve(server)
        );
    });
}

export class Server extends EventEmitter {
    public readonly env: IServerEnv;
    private readonly instance: Instance;

    public readonly port: number;

    constructor(
        env: IServerEnv,
        options?: TJSON,
        clusterSize?: IClusterConstraints
    ) {
        super();

        this.env = env;
        this.port = this.env.port;

        const onlineDeferral = new DeferredCall(() => this.emit("online"), 2);

        this.instance = new Instance(
            env,
            options,
            this.env.dev
                ? {
                      processes: 1,
                      threads: 1
                  }
                : clusterSize
        ).on("online", () => onlineDeferral.call());

        const logger: Logger = new Logger(this.env.cwd);

        (
            (!this.env.dev && (this.env.tls ?? {}).cert
                ? createHTTPSServer
                : createHTTPServer) as typeof createHTTPSServer
        )(
            {
                ...(this.env.tls
                    ? {
                          ca: this.resolveTLSParameter(this.env.tls.ca)
                      }
                    : {})
            },
            (dReq: IncomingMessage, dRes: ServerResponse) => {
                (["POST"].includes(dReq.method)
                    ? new Promise((resolve, reject) => {
                          const body: string[] = [];
                          dReq.on("readable", () => {
                              body.push(dReq.read() as string);
                          });
                          dReq.on("end", () => resolve(body.join("")));
                          dReq.on("error", (err: Error) => reject(err));
                      })
                    : Promise.resolve(null)
                )
                    .then((body: string) => {
                        const sReq: ISerialRequest = {
                            method: dReq.method as THTTPMethod,
                            url: dReq.url,
                            headers: dReq.headers,
                            body: body,
                            clientIP: dReq.socket.remoteAddress
                        };

                        this.instance
                            .assign(sReq)
                            .then((sRes: ISerialResponse) => {
                                dRes.statusCode = sRes.status;
                                for (const header in sRes.headers) {
                                    dRes.setHeader(
                                        header,
                                        [sRes.headers[header]].flat().join(", ")
                                    );
                                }
                                sRes.body && dRes.write(sRes.body);
                            })
                            .catch((err: TStatus | Error) => {
                                if (
                                    isNaN(err as TStatus) ||
                                    ![2, 3, 4, 5].includes(
                                        ~~((err as TStatus) / 100)
                                    )
                                )
                                    throw err;

                                dRes.statusCode = err as TStatus;
                            })
                            .finally(() => dRes.end());

                        this.emit("request", sReq);
                    })
                    .catch((err: Error) => {
                        dRes.statusCode = 500;
                        dRes.end();

                        logger && logger.error(err);
                    });
            }
        ).listen(this.port, () => onlineDeferral.call());
    }

    private resolveTLSParameter(
        param: (string | Buffer)[] | undefined
    ): (string | Buffer)[] {
        return [param]
            .flat()
            .map((param: string | Buffer | undefined) => {
                if (!param) return null;
                if (param instanceof Buffer) return param;

                const potentialPath: string = resolve(this.env.cwd, param);
                if (!existsSync(potentialPath)) return param;

                return readFileSync(potentialPath);
            })
            .filter((param: string | Buffer | null) => !!param);
    }
}
