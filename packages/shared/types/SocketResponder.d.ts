/// <reference types="node" />
import { Socket } from "net";
import { TStatusCode, THeaders } from "./types";
export declare class SocketResponder {
    static respond(socket: Socket, status: TStatusCode, headers?: THeaders, message?: Uint8Array): void;
}
//# sourceMappingURL=SocketResponder.d.ts.map