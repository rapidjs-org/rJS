import { Socket } from "net";
import { STATUS_CODES } from "http";

import { TSerializable, TStatus } from "../.shared/global.types";
import { ISerialRequest, ISerialResponse } from "../.shared/global.interfaces";
import { IAdapterConfiguration } from "../AWorkerCluster";
import { TAdapter, Adapter } from "../Adapter";

process.once("message", async (workerData: IAdapterConfiguration) => {
    function serializableToBuffer(serializable: TSerializable): Buffer {
        if (Buffer.isBuffer(serializable)) return serializable;
        if ([undefined, null].includes(serializable)) return Buffer.from("");
        if (!(serializable instanceof Uint8Array))
            return Buffer.from(serializable.toString());

        const buffer: Buffer = Buffer.alloc(serializable.byteLength);
        for (let i = 0; i < buffer.length; ++i) {
            buffer[i] = serializable[i];
        }
        return buffer;
    }

    function writeResponse(
        sResPartial: Partial<ISerialResponse>,
        socket?: Socket,
        keepalive: boolean = true
    ): Promise<Partial<ISerialResponse>> {
        return new Promise((resolve, reject) => {
            if (!socket) return resolve(sResPartial);

            const status: TStatus = sResPartial.status ?? 500;
            const rawBody: string[] = [];
            rawBody.push(`HTTP/1.1 ${status} ${STATUS_CODES[status]}`);
            rawBody.push(
                ...Object.entries(sResPartial.headers ?? {}).map(
                    (entry: [string, string | readonly string[]]) =>
                        `${entry[0]}: ${entry[1]}`
                )
            );
            rawBody.push(...["", ""]);
            const body: Buffer = Buffer.concat([
                Buffer.from(rawBody.join("\r\n")),
                serializableToBuffer(sResPartial.body)
            ]);
            socket.write(body, (err?: Error) => {
                !err ? resolve(sResPartial) : reject(err);
            });
        });
    }

    new Adapter(workerData.modulePath, workerData.options)
        .loadHandler()
        .then(async (handler: TAdapter) => {
            process.on(
                "message",
                async (sReq: ISerialRequest, socket?: Socket) => {
                    try {
                        process.send(
                            await writeResponse(await handler(sReq), socket)
                        );
                    } catch (err) {
                        process.send(
                            await writeResponse(
                                {
                                    status: isNaN(err) ? 500 : err
                                },
                                socket
                            )
                        );

                        if (isNaN(err)) throw err;
                    }
                }
            );

            process.send("online");
        });
});
