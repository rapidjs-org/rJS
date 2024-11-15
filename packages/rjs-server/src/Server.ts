import { EventEmitter } from "events";
import {
    IncomingMessage,
    ServerResponse,
    createServer as createHTTPServer
} from "http";
import {
    Server as HTTPSServer,
    createServer as createHTTPSServer
} from "https";
import { resolve } from "path";
import { existsSync, readFileSync } from "fs";
import { connect as connectTLS } from "tls";

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
        passphrase?: string;
    };
}

export function createServer(
    env: IServerEnv,
    options?: TJSON,
    deployPaths?: string[],
    clusterSize?: IClusterConstraints
): Promise<Server> {
    return new Promise((resolve) => {
        const server: Server = new Server(
            env,
            options,
            deployPaths,
            clusterSize
        ).on("online", () => resolve(server));
    });
}

export class Server extends EventEmitter {
    private static resolveTLSParameter(
        cwd: string,
        param: string | Buffer | (string | Buffer)[] | undefined
    ): (string | Buffer)[] {
        return [param]
            .flat()
            .map((param: string | Buffer | undefined) => {
                if (!param) return null;
                if (param instanceof Buffer) return param;

                const potentialPath: string = resolve(cwd, param);
                if (!existsSync(potentialPath)) return param;

                return readFileSync(potentialPath);
            })
            .filter((param: string | Buffer | null) => !!param);
    }

    private static getSecureContext(
        cwd: string,
        paramCert: string | Buffer,
        paramKey?: string | Buffer,
        paramCa?: (string | Buffer)[],
        passphrase?: string
    ) {
        return {
            cert: Server.resolveTLSParameter(cwd, paramCert),
            key: Server.resolveTLSParameter(cwd, paramKey),
            ca: Server.resolveTLSParameter(cwd, paramCa),

            passphrase
        };
    }

    public readonly env: IServerEnv;
    private readonly instance: Instance;
    private readonly server: HTTPSServer;

    public readonly port: number;

    constructor(
        env: IServerEnv,
        options?: TJSON,
        deployPaths?: string[],
        clusterSize?: IClusterConstraints
    ) {
        super();

        this.env = env;
        this.port = this.env.port;

        const onlineDeferral = new DeferredCall(() => this.emit("online"), 2);

        this.instance = new Instance(
            env,
            options,
            deployPaths,
            this.env.dev
                ? {
                      processes: 1,
                      threads: 1
                  }
                : clusterSize
        ).on("online", () => onlineDeferral.call());

        const logger: Logger = new Logger(this.env.cwd);
        const isSecure: boolean = !!(this.env.tls ?? {}).cert;

        this.server = (
            (!this.env.dev && isSecure
                ? createHTTPSServer
                : createHTTPServer) as typeof createHTTPSServer
        )((dReq: IncomingMessage, dRes: ServerResponse) => {
            (["POST", "PUT"].includes(dReq.method)
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
                        secure: isSecure,
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
        }).listen(this.port, () => onlineDeferral.call());

        isSecure && this.updateSecureContext();
    }

    private writeSecureContext() {
        const context = Server.getSecureContext(
            this.env.cwd,
            this.env.tls.cert,
            this.env.tls.key,
            this.env.tls.ca,
            this.env.tls.passphrase
        );

        try {
            this.server.setSecureContext(context);
        } catch (err: unknown) {
            console.error(err);
        }
    }

    private updateSecureContext() {
        this.writeSecureContext();

        setTimeout(() => this.writeSecureContext(), 3000); // Safety retry

        const socket = connectTLS(
            {
                host: "localhost",
                port: this.port
                /* servername: 'medium.com' */
            },
            () => {
                const peerCertificate = socket.getPeerCertificate();

                let msUntilInvalid;
                try {
                    msUntilInvalid =
                        Date.parse(peerCertificate.valid_to) - Date.now();
                } catch {
                    msUntilInvalid = Infinity;
                }
                const msUntilUpdate = Math.max(
                    Math.min(2 ** 31 - 1, msUntilInvalid),
                    60000
                );
                console.log(msUntilUpdate);
                socket.destroy();

                setTimeout(() => this.updateSecureContext(), msUntilUpdate);
            }
        ).on("error", () => {
            console.error(
                "Update on renewal is not supported for self-signed certificates."
            );
        });
    }
}
