import { join } from "path";
import { STATUS_CODES, IncomingMessage, ServerResponse, createServer } from "http";
import { Socket } from "net";

import { ThreadPool } from "./ThreadPool";
import { DeferredCall } from "./DeferredCall";
import { ISerialRequest, ISerialResponse } from "./interfaces";
import { THTTPMethod, TStatus } from "./types";


const onlineDeferral = new DeferredCall(2);

const threadPool = new ThreadPool(join(__dirname, "./thread/api.thread"), {    
    ...process.env.DEV ? { baseSize: 1 } : {}
})
.once("online", () => onlineDeferral.call());


process.once("message", () => onlineDeferral.call(() => {
    process.on("message", handleRequest);
}));


function respond(sResPartial: Partial<ISerialResponse>, socket: Socket) {
    console.log(sResPartial)
    const status: TStatus = sResPartial.status ?? 500;

    const data: string[] = [];
    data.push(`HTTP/1.1 ${status ?? 500} ${STATUS_CODES[status]}`);
    data.push(
        ...Object.entries(sResPartial.headers ?? {})
        .map((entry: [ string, string|readonly string[] ]) => `${entry[0]}: ${entry[1]}`)
    );
    data.push(`\r\n${sResPartial.body ?? ""}`);
    console.log(data
        .flat()
        .join("\r\n"))
    socket.write(Buffer.from(
        data
        .flat()
        .join("\r\n"),
        "utf-8"
    ));
    
    socket.end(() => socket.destroy());
}

async function handleRequest(sReq: ISerialRequest, socket: Socket) {
    threadPool.assign(sReq)
    .then((sRes: Partial<ISerialResponse>) => respond(sRes, socket))
    .catch((err: unknown) => {
        console.error(err);

        respond({
            ...(typeof(err) === "number") ? { status: err as TStatus } : {},
            ...(typeof(err) !== "number") ? { body: err.toString() } : {},
        }, socket);
    });
}


export interface IServerOptions {
    port: number;
}


export function serve(options: Partial<IServerOptions>): Promise<void> {
    const optionsWithDefaults = {
        port: 80,

        ...options
    };

    return new Promise((resolve) => {
        // TODO: HTTPS option, multiplex on proxy
		createServer((dReq: IncomingMessage, dRes: ServerResponse) => {
            new Promise((resolve, reject) => {
                const body: string[] = [];
                dReq.on("readable", () => {
                    body.push(dReq.read());
                });
                dReq.on("end", () => resolve(body.join()));
                dReq.on("error", (err: Error) => reject(err));
            })
            .then((body: string) => {
                handleRequest({
                    method: dReq.method as THTTPMethod,
                    url: dReq.url,
                    headers: dReq.headers,
                    body: body,
                    clientIP: dReq.socket.remoteAddress
                }, dReq.socket);
            })
            .catch((err: Error) => {
                dRes.statusCode = 500;
                dRes.end();

                console.error(err);
            })
        })
        .listen(optionsWithDefaults.port, () => onlineDeferral.call(resolve));
	});
}