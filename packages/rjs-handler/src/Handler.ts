import { resolve } from "path";

import { THeaders, TSerializable, TStatus } from "./.shared/global.types";
import { ISerialRequest, ISerialResponse } from "./.shared/global.interfaces";
import { Options } from "./.shared/Options";
import { Config } from "./Config";
import { VirtualFileSystem } from "./VirtualFileSystem";
import { RateLimiter } from "./RateLimiter";
import { Cache } from "./Cache";
import { AHandlerContext } from "./AHandlerContext";
import { GetHandlerContext } from "./GetHandlerContext";
import { PostHandlerContext } from "./PostHandlerContext";

import _config from "./_config.json";

import GLOBAL_CONFIG_DEFAULTS from "./config.defaults.json";
import { RPCController } from "./RPCController";

export interface IHandlerOptions {
    apiDirPath?: string;
    pluginDirPath?: string;
    publicDirPath?: string;
    cwd?: string;
    dev?: boolean;
}

export class Handler {
    private readonly config: Config;
    private readonly vfs: VirtualFileSystem;
    private readonly rateLimiter: RateLimiter;
    private readonly responseCache: Cache<
        Partial<ISerialRequest>,
        ISerialResponse
    >;
    private readonly rpcController: RPCController | null;

    constructor(options: Partial<IHandlerOptions>) {
        const optionsWithDefaults: IHandlerOptions = new Options(options, {
            dev: false, // TODO: dev also via env var?
            cwd: process.cwd()
        }).object;

        this.config = new Config(
            optionsWithDefaults.cwd,
            _config.globalConfigName,
            options.dev,
            GLOBAL_CONFIG_DEFAULTS
        );
        this.rateLimiter = new RateLimiter(
            this.config.read("security", "maxRequestsPerMin").number()
        );
        this.responseCache = new Cache(
            this.config.read("peformance", "serverCacheMs").number()
        );

        this.vfs = new VirtualFileSystem(
            this.config,
            optionsWithDefaults.dev,
            optionsWithDefaults.publicDirPath
                ? resolve(
                      optionsWithDefaults.cwd,
                      optionsWithDefaults.publicDirPath
                  )
                : null,
            optionsWithDefaults.pluginDirPath
                ? resolve(
                      optionsWithDefaults.cwd,
                      optionsWithDefaults.pluginDirPath
                  )
                : null
        );
        this.rpcController = optionsWithDefaults.apiDirPath
            ? new RPCController(
                  resolve(
                      optionsWithDefaults.cwd,
                      optionsWithDefaults.apiDirPath
                  )
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
            const resolveWithStatus = (status: TStatus) => {
                resolve({
                    status,
                    headers: {}
                });
            };

            if (!this.rateLimiter.grantsAccess(sReq.clientIP)) {
                resolveWithStatus(429);

                return;
            }

            const cacheKey: Partial<ISerialRequest> = {
                method: sReq.method,
                url: sReq.url // TODO: Consider query part? No-cache signal? ...
            };
            if (this.responseCache.has(cacheKey)) {
                resolve(this.responseCache.get(cacheKey));

                return;
            }
            if (
                sReq.url.length >
                this.config.read("security", "maxRequestURILength").number()
            ) {
                resolveWithStatus(414);

                return;
            }
            if (
                (sReq.body ?? "").length >
                this.config
                    .read("security", "maxRequestBodyByteLength")
                    .number()
            ) {
                resolveWithStatus(413);

                return;
            }
            if (
                Object.entries(sReq.headers).reduce(
                    (acc: number, cur: [string, TSerializable]) =>
                        acc + cur[0].length + cur[1].toString().length,
                    0
                ) >
                this.config.read("security", "maxRequestHeadersLength").number()
            ) {
                resolveWithStatus(431);

                return;
            }

            let handler: AHandlerContext;
            switch (sReq.method) {
                case "GET":
                case "HEAD":
                    if (sReq.body) {
                        resolveWithStatus(400);

                        return;
                    }

                    handler = new GetHandlerContext(
                        sReq,
                        this.config,
                        this.vfs,
                        this.config.read("headers").object() as THeaders
                    );
                    break;
                case "POST":
                    if (!this.rpcController) {
                        resolveWithStatus(405);

                        return;
                    }

                    handler = new PostHandlerContext(
                        sReq,
                        this.config,
                        this.rpcController
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
