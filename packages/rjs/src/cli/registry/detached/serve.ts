import { FileServer, createFileServer } from "../../../FileServer";

export interface IServeEnv {
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

export async function serve(env: IServeEnv): Promise<number> {
    const server: FileServer = await createFileServer(env);

    return server.port;
}

process.on("message", async (env: IServeEnv) => {
    process.send(await serve(env));
});
