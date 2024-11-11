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
import { Request } from "./Request";
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
    private readonly configuredHostnames: string[];

    constructor(env: Partial<IHandlerEnv>, options: TJSON = {}) {
        this.env = new Options(env ?? {}, {
            dev: false,
            cwd: process.cwd()
        }).object;
        this.config = new TypeResolver(options ?? {}, GLOBAL_CONFIG_DEFAULTS);

        this.configuredHostnames = [
            "localhost",
            "127.0.0.1",
            ...this.config
                .read("hostnames")
                .array<string>()
                .filter((hostname: string) => {
                    return (
                        /^(([\w\d]|[\w\d][\w\d-]*[\w\d])\.)*([\w\d]|[\w\d][\w\d-]*[\w\d])$/.test(
                            hostname.toString()
                        ) ||
                        /^((\d|[1-9]\d|1\d{2}|2[0-4]\d|25[0-5])\.){3}(\d|[1-9]\d|1\d{2}|2[0-4]\d|25[0-5])$/.test(
                            hostname.toString()
                        )
                    );
                })
        ];

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
            secure: false,
            method: "GET",
            url: "/",
            headers: {},

            ...sReqPartial
        };
        const request: Request = new Request(sReq);

        return new Promise((resolve) => {
            const resolveWithStatus = (status: TStatus) => {
                resolve({
                    status,
                    headers: {}
                });
            };

            if (
                !this.configuredHostnames.includes(request.url.hostname) &&
                this.config.read("www").string() &&
                !this.configuredHostnames.includes(
                    request.url.hostname.replace(/^www\./, "")
                )
            ) {
                resolveWithStatus(403);

                return;
            }

            const enforceSecurityMeasure = (): boolean => {
                if (!this.rateLimiter.grantsAccess(sReq.clientIP)) {
                    resolveWithStatus(429);

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

            const cacheKey: Partial<ISerialRequest> = {
                method: sReq.method,
                url: sReq.url // TODO: Consider query part? No-cache signal? ...
            };
            if (this.responseCache.has(cacheKey)) {
                resolve(this.responseCache.get(cacheKey));

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

                    handler = new GETHandlerContext(
                        request,
                        this.config,
                        this.vfs,
                        this.config.read("headers").object() as THeaders,
                        this.env.dev
                    );
                    break;
                case "PUT":
                    if (!this.rpcController) {
                        resolveWithStatus(405);

                        return;
                    }

                    handler = new PUTHandlerContext(
                        request,
                        this.config,
                        this.rpcController,
                        this.env.dev
                    );
                    break;
                case "POST":
                    handler = new POSTHandlerContext(
                        request,
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
