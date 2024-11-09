import { resolve } from "path";

import {
    TAtomicSerializable,
    THeaders,
    TJSON,
    TStatus
} from "./.shared/global.types";
import { ISerialRequest, ISerialResponse } from "./.shared/global.interfaces";
import { Options } from "./.shared/Options";
import { TypeResolver } from "./TypeResolver";
import { VirtualFileSystem } from "./VirtualFileSystem";
import { RateLimiter } from "./RateLimiter";
import { Cache } from "./Cache";
import { RPCController } from "./RPCController";
import { AHandlerContext } from "./handler-context/AHandlerContext";
import { GETHandlerContext } from "./handler-context/GETHandlerContext";
import { POSTHandlerContext } from "./handler-context/POSTHandlerContext";
import { PUTHandlerContext } from "./handler-context/PUTHandlerContext";

import GLOBAL_CONFIG_DEFAULTS from "./config.defaults.json";

export interface IHandlerEnv {
    apiDirPath?: string;
    sourceDirPath?: string;
    publicDirPath?: string;
    cwd?: string;
    dev?: boolean;
}

export class Handler {
    // TODO: Event emitter to communicate preretrieval done?
    private readonly env: IHandlerEnv;
    private readonly config: TypeResolver;
    private readonly vfs: VirtualFileSystem;
    private readonly rateLimiter: RateLimiter;
    private readonly responseCache: Cache<
        Partial<ISerialRequest>,
        ISerialResponse
    >;
    private readonly rpcController: RPCController | null;

    constructor(env: Partial<IHandlerEnv>, options: TJSON = {}) {
        this.env = new Options(env ?? {}, {
            dev: false,
            cwd: process.cwd()
        }).object;
        this.config = new TypeResolver(options ?? {}, GLOBAL_CONFIG_DEFAULTS);
        this.rateLimiter = new RateLimiter(
            this.config.read("security", "maxRequestsPerMin").number()
        );
        this.responseCache = new Cache(
            !this.env.dev
                ? this.config.read("peformance", "serverCacheMs").number()
                : 0
        );
        this.vfs = new VirtualFileSystem(
            this.config,
            this.env.dev,
            this.env.publicDirPath
                ? resolve(this.env.cwd, this.env.publicDirPath)
                : null,
            this.env.sourceDirPath
                ? resolve(this.env.cwd, this.env.sourceDirPath)
                : null
        );
        this.rpcController = this.env.apiDirPath
            ? new RPCController(
                  resolve(this.env.cwd, this.env.apiDirPath),
                  this.env.dev
              )
            : null;
    }

    public activate(
        sReqPartial: Partial<ISerialRequest>
    ): Promise<ISerialResponse> {
        const sReq: ISerialRequest = {
            method: "GET",
            url: "/",
            headers: {},

            ...sReqPartial
        };

        return new Promise((resolve) => {
            const cacheKey: Partial<ISerialRequest> = {
                method: sReq.method,
                url: sReq.url // TODO: Consider query part? No-cache signal? ...
            };

            const resolveWithStatus = (status: TStatus) => {
                resolve({
                    status,
                    headers: {}
                });
            };
            const enforceSecurityMeasure = (): boolean => {
                if (!this.rateLimiter.grantsAccess(sReq.clientIP)) {
                    resolveWithStatus(429);

                    return true;
                }

                if (this.responseCache.has(cacheKey)) {
                    resolve(this.responseCache.get(cacheKey));

                    return true;
                }
                if (
                    sReq.url.length >
                    this.config.read("security", "maxRequestURILength").number()
                ) {
                    resolveWithStatus(414);

                    return true;
                }
                if (
                    (sReq.body ?? "").length >
                    this.config
                        .read("security", "maxRequestBodyByteLength")
                        .number()
                ) {
                    resolveWithStatus(413);

                    return true;
                }
                if (
                    Object.entries(sReq.headers).reduce(
                        (
                            acc: number,
                            cur: [
                                string,
                                (
                                    | TAtomicSerializable
                                    | readonly TAtomicSerializable[]
                                )
                            ]
                        ) => acc + cur[0].length + cur[1].toString().length,
                        0
                    ) >
                    this.config
                        .read("security", "maxRequestHeadersLength")
                        .number()
                ) {
                    resolveWithStatus(431);

                    return true;
                }

                return false;
            };

            if (!this.env.dev && enforceSecurityMeasure()) return;

            let handler: AHandlerContext;
            switch (sReq.method) {
                case "GET":
                case "HEAD":
                    if (sReq.body) {
                        resolveWithStatus(400);

                        return;
                    }

                    handler = new GETHandlerContext(
                        sReq,
                        this.config,
                        this.vfs,
                        this.config.read("headers").object() as THeaders,
                        this.env.dev
                    );
                    break;
                case "POST":
                    if (!this.rpcController) {
                        resolveWithStatus(405);

                        return;
                    }

                    handler = new POSTHandlerContext(
                        sReq,
                        this.config,
                        this.rpcController,
                        this.env.dev
                    );
                    break;
                case "PUT":
                    handler = new PUTHandlerContext(
                        sReq,
                        this.config,
                        this.env.cwd,
                        this.env.dev
                    );
                    break;
                default:
                    resolveWithStatus(405);

                    return;
            }

            handler.once("response", (sRes: ISerialResponse) => {
                if (sReq.method === "HEAD") {
                    delete sRes.body;
                }

                this.responseCache.set(cacheKey, sRes);

                resolve(sRes);
            });

            try {
                handler.process();
            } catch (err: unknown) {
                const isStatusError: boolean = /^[2345]\d{2}$/.test(
                    (err as string).toString()
                );

                handler.emit(
                    "response",
                    resolveWithStatus(isStatusError ? (err as TStatus) : 500)
                );

                if (isStatusError) return;

                throw err;
            }
        });
    }
}
