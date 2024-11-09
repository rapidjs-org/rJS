import { dirname, basename, join, resolve } from "path";
import { existsSync, readdirSync, writeFileSync, cpSync, rmSync } from "fs";
import { IncomingMessage, OutgoingHttpHeaders } from "http";
import { request } from "https";
import { createHmac, timingSafeEqual } from "crypto";

import { THeaders, TJSON } from "../.shared/global.types";
import { ISerialRequest } from "../.shared/global.interfaces";
import { Tar } from "../.shared/Tar";
import { AHandlerContext } from "./AHandlerContext";
import { TypeResolver } from "../TypeResolver";
import { LocalEnv } from "../LocalEnv";

import _config from "../_config.json";

enum EGitPlatform {
    GITHUB
}

interface IGitRemote {
    platform: EGitPlatform;
    account: string;
    repository: string;
    ref: string;
}

interface IApiResponse {
    status: number;
    headers: THeaders;
    body: Buffer;
}

export class POSTHandlerContext extends AHandlerContext {
    private static createInvalidRemoteError(): Error {
        return new SyntaxError("Invalid git remote platform");
    }

    private readonly cwd: string;
    private readonly localEnv: LocalEnv;
    private readonly repo: IGitRemote | null;

    constructor(
        sReq: ISerialRequest,
        config: TypeResolver,
        cwd: string,
        dev: boolean
    ) {
        super(sReq, config, dev);

        try {
            const remoteUrl: string = (
                (
                    (require(join(cwd, "package.json")) as TJSON)
                        .repository as TJSON
                ).url as string
            ).toLowerCase();
            const remoteInfo: string[] =
                remoteUrl.match(
                    /^(?:(github):)?([A-Za-z0-9_-]+)\/([A-Za-z0-9._-]+)$/i
                ) ||
                remoteUrl.match(
                    /^(?:git\+)?https:\/\/(?:(github)\.com)\/([A-Za-z0-9_-]+)\/([A-Za-z0-9._-]+)$/i
                ) ||
                [];

            let platform: EGitPlatform;
            switch (remoteInfo[1] ?? "github") {
                case "github":
                    platform = EGitPlatform.GITHUB;
                    break;
                default:
                    throw POSTHandlerContext.createInvalidRemoteError();
            }
            this.repo = {
                platform,

                account: remoteInfo[2],
                repository: remoteInfo[3].replace(/\.git$/i, ""),
                ref: "main" // TODO: Configurable?
            };
        } catch {}

        this.cwd = cwd;
        this.localEnv = new LocalEnv(dev, cwd);
    }

    private requestAPI(
        method: string,
        url: string,
        headers: OutgoingHttpHeaders = {}
    ): Promise<IApiResponse> {
        return new Promise((resolve, reject) => {
            request(
                url,
                {
                    method,
                    headers
                },
                (res: IncomingMessage) => {
                    if (
                        !["2", "3"].includes(
                            res.statusCode.toString().charAt(0)
                        )
                    ) {
                        reject();

                        return;
                    }

                    const body: Buffer[] = [];
                    res.on("data", (chunk: Buffer) => {
                        body.push(chunk);
                    });
                    res.on("end", () => {
                        resolve({
                            status: res.statusCode,
                            headers: res.headers,
                            body: Buffer.concat(body)
                        });
                    });
                    res.on("error", (err: Error) => {
                        this.response.setStatus(500);

                        reject(err);
                    });
                }
            )
                .on("error", reject)
                .end();
        });
    }

    private hookGithub(): TJSON {
        const signatureHeader = this.request.getHeader(
            "X-Hub-Signature-256"
        ) as string;
        if (!signatureHeader) {
            this.response.setStatus(404);

            return;
        }

        const payload: TJSON = this.request.getBody().json();
        const digest = Buffer.from(
            `sha256=${createHmac(
                "sha256",
                this.localEnv.read(_config.envWebhookSecretKey) ?? ""
            )
                .update(JSON.stringify(payload))
                .digest("hex")}`,
            "utf8"
        );
        const signature = Buffer.from(signatureHeader, "utf8");
        if (!timingSafeEqual(digest, signature)) {
            this.response.setStatus(403);

            return;
        }

        return payload;
    }

    private async pullGithub() {
        const authObj: TJSON = this.localEnv.read(_config.envWebhookAuthKey)
            ? {
                  Authorization: `Bearer ${this.localEnv.read(_config.envWebhookAuthKey)}`
              }
            : {};

        const locationRes: IApiResponse = await this.requestAPI(
            "HEAD",
            join(
                "https://api.github.com",
                "repos",
                this.repo.account,
                this.repo.repository,
                "tarball",
                this.repo.ref
            ),
            {
                Accept: "application/vnd.github.raw+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "request",

                ...authObj
            }
        );

        const tarRes: IApiResponse = await this.requestAPI(
            "GET",
            locationRes.headers["location"] as string,
            {
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "request",

                ...authObj
            }
        );

        const constructHiddenPath = (baseName: string): string => {
            let i = 0;
            let hiddenPath: string;
            do {
                hiddenPath = join(this.cwd, `.${i++}.${baseName}`);
            } while (existsSync(hiddenPath));
            return hiddenPath;
        };

        const tarPath: string = constructHiddenPath(
            _config.webhookTempTarBaseName
        );
        const dirPath: string = constructHiddenPath(
            _config.webhookTempDirBaseName
        );

        writeFileSync(tarPath, tarRes.body);
        new Tar(tarPath)
            .extract(dirname(dirPath), basename(dirPath))
            .finally(() => {
                rmSync(tarPath, {
                    force: true
                });

                readdirSync(dirPath).forEach((path: string) => {
                    cpSync(join(dirPath, path), join(this.cwd, path), {
                        force: true,
                        recursive: true
                    });
                });

                rmSync(dirPath, {
                    force: true,
                    recursive: true
                });

                resolve();
            });
    }

    public async process(): Promise<void> {
        if (!this.repo || this.request.url.pathname !== "/") {
            this.response.setStatus(404);

            this.respond();

            return;
        }

        const userAgent =
            (this.request.getHeader("User-Agent") as string) ?? "";
        let payload: TJSON;
        let gitPlatform: EGitPlatform;
        if (/github/.test(userAgent.toLowerCase())) {
            gitPlatform = EGitPlatform.GITHUB;
        }
        try {
            switch (gitPlatform) {
                case EGitPlatform.GITHUB:
                    payload = this.hookGithub();
                    break;
                default:
                    throw POSTHandlerContext.createInvalidRemoteError();
            }

            if (!payload || payload.isDryRun) return;

            switch (gitPlatform) {
                case EGitPlatform.GITHUB:
                    await this.pullGithub();
                    break;
                default:
                    throw POSTHandlerContext.createInvalidRemoteError();
            }
        } catch (err: unknown) {
            console.error(err);

            this.response.setStatus(404);
        } finally {
            this.respond();
        }
    }
}
