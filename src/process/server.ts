import { IncomingMessage, ServerResponse } from "http";
import { join } from "path";
import { brotliCompressSync, deflateSync, gzipSync } from "zlib";

import { IRequest, IHighlevelLocale, IHighlevelURL, THighlevelCookieIn } from "../interfaces";
import { TResponseOverload } from "../types";
import { respond } from "../respond";
import { ENV } from "../ENV";
import { SPACE_CONFIG } from "../SPACE_CONFIG";
import * as print from "../print";

import { ThreadPool } from "./ThreadPool";
import { RateLimiter } from "./RateLimiter";


interface IAcceptHeaderPart {
    name: string;
    quality: number;
}


process.on("uncaughtException", (err: Error) => {
    console.error(err);
    
    // TODO: Handle

    signalDone(); // TODO: Signal error (or keep "error"?)
});


const runsSecure = !!SPACE_CONFIG.data.tls;
const threadPool: ThreadPool = new ThreadPool(join(__dirname, "./thread/thread"));
const rateLimiter: RateLimiter<string> = new RateLimiter(ENV.MODE.DEV ? Infinity : SPACE_CONFIG.data.limit.requestsPerClient);

threadPool.init();


process.on("message", async (_, dRes: ServerResponse) => {
    // TODO: How to handle REQUEST?
    
    const clientIP: string = dReq.headers["x-forwarded-for"]
    ? flattenHeader(dReq.headers["x-forwarded-for"]).split(/,/g).shift().trim()
    : dReq.socket.remoteAddress;
    
    if(!rateLimiter.grantsAccess(clientIP)) {
        return respond(dRes, 429);
    }
    if(dReq.url.length > SPACE_CONFIG.data.limit.urlLength) {
        return respond(dRes, 414);
    }
    
    const method: string = dReq.method.toUpperCase();

    ([ "POST", "PUT", "OPTIONS" ].includes(method)
    ? parseRequestBody(dReq)
    : new Promise(r => r(null)))
    .then(async (body: string) => {
        if(body?.length >= SPACE_CONFIG.data.limit.payloadSize) {
            return respond(dRes, 413);
        }

        const host: string = constructStrongHost(dReq.headers["host"]); // TODO: Compare with config (multiple, strict, ...?)
        const dynamicURL: URL = new URL(!/^https?:\/\//.test(dReq.url)
        ? `${host}${dReq.url}`
        : dReq.url);
        const highlevelURL: IHighlevelURL = {
            hash: dynamicURL.hash,
            host: dynamicURL.host,
            hostname: dynamicURL.hostname,
            href: dynamicURL.href,
            origin: dynamicURL.origin,
            password: dynamicURL.password,
            pathname: dynamicURL.pathname,
            port: dynamicURL.port,
            protocol: dynamicURL.protocol,
            search: dynamicURL.search,
            username: dynamicURL.username,

            searchParams: Object.fromEntries(dynamicURL.searchParams.entries())
        };

        const parseAcceptHeader = (name: string) => {
            return flattenHeader(dReq.headers[name] ?? "")
            .split(/,/g)
            .map((encoding: string) => encoding.trim())
            .filter((encoding: string) => encoding)
            .map((enconding: string) => {
                return {
                    name: enconding.match(/^[^;]+/)[0],
                    quality: parseFloat((enconding.match(/;q=([01](.[0-9]+)?)$/) || [ null, "1" ])[1])
                };
            })
            .sort((a, b) => (b.quality - a.quality)) as IAcceptHeaderPart[]
            ?? null;
        };

        const acceptedLocale: IAcceptHeaderPart[] = parseAcceptHeader("accept-language");
        const highlevelLocale: IHighlevelLocale[] = acceptedLocale
        .map((locale: IAcceptHeaderPart) => {
            const parts: string[] = locale.name.match(/^([a-z]+|\*)(-([A-Z]+))?$/);
            
            if(!parts) {
                return null;
            }
            
            return {
                language: parts[1],
                quality: locale.quality,

                ... parts[3]
                ? {
                    region: parts[3]
                }: {}
            };
        })
        .filter((locale: IHighlevelLocale) => locale);

        const highlevelCookies: THighlevelCookieIn = {};
        (dReq.headers["cookie"] ?? "")
        .split(/;/g)
        .forEach((cookie: string) => {
            if(!/\s*[^;, ]+=.+\s*/.test(cookie)) {
                return;
            }

            const parts: string[] = cookie.split(/=/);
            let value: string|number|boolean;
            try {
                value = JSON.parse(parts[1]);
            } catch {
                value = parts[1];
            }

            highlevelCookies[parts[0].trim()] = value;
        });

        const sReq: IRequest = {
            method: method,
            url: highlevelURL,
            cookies: highlevelCookies,
            locale: highlevelLocale,
            headers: dReq.headers,  // TODO: High-level headers interface?
            
            ... body ? { body } : {}
        };
        
        // TODO: So far, only successful requests; Add more events (rejected requests ... ?)
        process.send({
            signal: "reg:request",
            data: sReq
        });

        // Remove auto-processed headers from serialized high-level representation
        delete sReq.headers["host"];
        delete sReq.headers["accept-encoding"];
        delete sReq.headers["accept-language"];
        delete sReq.headers["cookie"];

        threadPool.assign(sReq)
        .then((sResOverload: TResponseOverload) => {
            if(typeof sResOverload === "number"
            || sResOverload.message instanceof Buffer) {
                return respond(dRes, sResOverload);
            }

            sResOverload.message = (typeof sResOverload.message !== "string")
            ? String(sResOverload.message)
            : sResOverload.message;

            let acceptedEncoding: string = parseAcceptHeader("accept-encoding")
            .shift()?.name
            .replace(/^\*$/, "gzip");
            switch(acceptedEncoding) {
                case "gzip":
                    sResOverload.message = gzipSync(sResOverload.message);
                    break;
                case "br":
                    sResOverload.message = brotliCompressSync(sResOverload.message);
                    break;
                case "deflate":
                    sResOverload.message = deflateSync(sResOverload.message);
                    break;
                default:
                    sResOverload.message = Buffer.from(sResOverload.message, "utf-8");

                    acceptedEncoding = null;
            }

            respond(dRes, sResOverload, {
                "Content-Encoding": acceptedEncoding
            });
        })
        .catch(err => {
            print.error(err);

            respond(dRes, 500);
        });
    })
    .catch(err => {
        print.error(err);

        respond(dRes, 422);
    });
});


function signalDone() {
    process.send("done");
}

function constructStrongHost(weakHost: string): string {
    return weakHost
    .replace(/^(https?:\/\/)?/, `http${runsSecure ? "s" : ""}://`)
    .replace(/(:[0-9]+)?$/, `:${SPACE_CONFIG.data.port}`);
}

function flattenHeader(header: string|string[]): string {
    return [ header ].flat()[0];
}

function parseRequestBody(oReq: IncomingMessage): Promise<string> {
    const body: string[] = [];
    
    return new Promise((resolve, reject) => {
        oReq.on("data", (chunk: string) => {
            body.push(chunk);
        });

        oReq.on("end", () => {
            try {
                resolve(body.length ? body.join("") : null);
            } catch(err) {
                reject(err);
            }
        });

        oReq.on("error", err => {
            reject(err);
        });
    });
}