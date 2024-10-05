import { EventEmitter } from "events";
import {
    IncomingMessage,
    ServerResponse,
    createServer as createHTTPServer
} from "http";
import { createServer as createHTTPSServer } from "https";
import { resolve } from "path";
import { existsSync, readFileSync } from "fs";

import { THTTPMethod } from "./.shared/global.types";
import { ISerialRequest, ISerialResponse } from "./.shared/global.interfaces";
import { IClusterSize } from "./local.interfaces";
import { Options } from "./.shared/Options";
import { DeferredCall } from "./DeferredCall";
import { Logger } from "./Logger";
import { Instance } from "./Instance";

import { IHandlerOptions } from "@rapidjs.org/rjs-handler";

export interface IServerOptions extends IHandlerOptions {
    port: number;

    tls?: {
        cert: string | Buffer;
        key: string | Buffer;

        ca?: (string | Buffer)[];
    };
}

export function createServer(
    options?: Partial<IServerOptions>,
    clusterSize?: IClusterSize
): Promise<Server> {
    return new Promise((resolve) => {
        const server: Server = new Server(options, clusterSize).on(
            "online",
            () => resolve(server)
        );
    });
}

export class Server extends EventEmitter {
    private readonly instance: Instance;

    public readonly port: number;

    constructor(options?: Partial<IServerOptions>, clusterSize?: IClusterSize) {
        super();

        const optionsWithDefaults: IServerOptions = new Options<IServerOptions>(
            options,
            {
                port: !options.dev ? (!options.tls ? 80 : 443) : 7777
            }
        ).object;
        this.port = optionsWithDefaults.port;

        const onlineDeferral = new DeferredCall(() => this.emit("online"), 2);

        this.instance = new Instance(
            optionsWithDefaults,
            optionsWithDefaults.dev
                ? {
                      processes: 1,
                      threads: 1
                  }
                : clusterSize
        ).on("online", () => onlineDeferral.call());

        const logger: Logger = new Logger(options.cwd);

        const resolveTLSParameter = (
            param: (string | Buffer)[] | undefined
        ): (string | Buffer)[] => {
            return [param]
                .flat()
                .map((param: string | Buffer | undefined) => {
                    if (!param) return null;
                    if (param instanceof Buffer) return param;

                    const potentialPath: string = resolve(options.cwd, param);
                    if (!existsSync(potentialPath)) return param;

                    return readFileSync(potentialPath);
                })
                .filter((param: string | Buffer | null) => !!param);
        };

        (
            (!options.dev && optionsWithDefaults.tls
                ? createHTTPSServer
                : createHTTPServer) as typeof createHTTPSServer
        )(
            {
                ...(optionsWithDefaults.tls
                    ? {
                          ca: resolveTLSParameter(optionsWithDefaults.tls.ca)
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
                            .handleRequest(sReq)
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
}
