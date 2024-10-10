import { resolve } from "path";

import { THeaders, TSerializable, TStatus } from "./.shared/global.types";
import { ISerialRequest, ISerialResponse } from "./.shared/global.interfaces";
import { Options } from "./.shared/Options";
import { Config } from "./Config";
import { VirtualFileSystem } from "./VirtualFileSystem";
import { RateLimiter } from "./RateLimiter";
import { Cache } from "./Cache";
import { RPCController } from "./RPCController";
import { AHandlerContext } from "./AHandlerContext";
import { GetHandlerContext } from "./GetHandlerContext";
import { PostHandlerContext } from "./PostHandlerContext";

import _config from "./_config.json";

import GLOBAL_CONFIG_DEFAULTS from "./config.defaults.json";

export interface IHandlerOptions {
    apiDirPath?: string;
    pluginDirPath?: string;
    publicDirPath?: string;
    cwd?: string;
    dev?: boolean;
}

export class Handler {
    // TODO: Event emitter to communicate preretrieval done?
    private readonly options: IHandlerOptions;
    private readonly config: Config;
    private readonly vfs: VirtualFileSystem;
    private readonly rateLimiter: RateLimiter;
    private readonly responseCache: Cache<
        Partial<ISerialRequest>,
        ISerialResponse
    >;
    private readonly rpcController: RPCController | null;

    constructor(options: Partial<IHandlerOptions>) {
        this.options = new Options(options, {
            dev: false, // TODO: dev also via env var?
            cwd: process.cwd()
        }).object;

        this.config = new Config(
            this.options.cwd,
            _config.globalConfigName,
            options.dev,
            GLOBAL_CONFIG_DEFAULTS
        );
        this.rateLimiter = new RateLimiter(
            this.config.read("security", "maxRequestsPerMin").number()
        );
        this.responseCache = new Cache(
            !this.options.dev
                ? this.config.read("peformance", "serverCacheMs").number()
                : 0
        );

        this.vfs = new VirtualFileSystem(
            this.config,
            this.options.dev,
            this.options.publicDirPath
                ? resolve(this.options.cwd, this.options.publicDirPath)
                : null,
            this.options.pluginDirPath
                ? resolve(this.options.cwd, this.options.pluginDirPath)
                : null
        );
        this.rpcController = this.options.apiDirPath
            ? new RPCController(
                  resolve(this.options.cwd, this.options.apiDirPath),
                  this.options.dev
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
                        (acc: number, cur: [string, TSerializable]) =>
                            acc + cur[0].length + cur[1].toString().length,
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

            if (!this.options.dev && enforceSecurityMeasure()) return;

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
                        this.config.read("headers").object() as THeaders,
                        this.options.dev
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
                        this.rpcController,
                        this.options.dev
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
