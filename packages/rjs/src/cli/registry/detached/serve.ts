import { FileServer, createFileServer } from "../../../FileServer";

export interface IServeData {
    dev: boolean;
    tls: {
        cert: string | Buffer;
        key: string | Buffer;
    };
    cwd: string;
    apiDirPath: string;
    sourceDirPath: string;
    publicDirPath: string;
    port: number;
}

export async function serve(data: IServeData): Promise<number> {
    const server: FileServer = await createFileServer(data);

    return server.port;
}

process.on("message", async (data: IServeData) => {
    process.send(await serve(data));
});
