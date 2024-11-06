import { EventEmitter } from "events";
import {
    IncomingMessage,
    ServerResponse,
    createServer as createHTTPServer
} from "http";

export function createTLSRedirectServer(
    sourcePort: number = 80,
    targetPort: number = 443
): Promise<void> {
    return new Promise((resolve) => {
        new TLSRedirectServer(sourcePort, targetPort).on("online", () =>
            resolve()
        );
    });
}

export class TLSRedirectServer extends EventEmitter {
    constructor(sourcePort: number = 80, targetPort: number = 443) {
        super();

        createHTTPServer((dReq: IncomingMessage, dRes: ServerResponse) => {
            if (!dReq.headers["host"]) {
                dRes.statusCode = 500;
                dRes.end();
            }

            targetPort;
            dRes.statusCode = 308;
            dRes.setHeader(
                "Location",
                [
                    `https://${dReq.headers["host"].replace(/:\d+$/, "")}`,
                    targetPort !== 443 ? `:${targetPort}` : "",
                    dReq.url
                ].join("")
            );
            dRes.end();
        }).listen(sourcePort, () => this.emit("online"));
    }
}
