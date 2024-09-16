import { IncomingMessage, ServerResponse, createServer } from "http";
import { resolve, join } from "path";
import { existsSync, readFileSync } from "fs";

import { Options } from "./.shared/Options";

import { EBuildFilter, Build, Filemap, File } from "@rapidjs.org/rjs-build";

import _config from "./_config.json";


export interface IFileServerOptions {
    privateDirectoryPath: string;
    publicDirectoryPath: string;
}

export class FileServer {
    private readonly build: Build<{}>;
    private readonly publicRootPath: string;

    constructor(options: Partial<IFileServerOptions>) {
        const optionsWithDefaults: IFileServerOptions = new Options(options, {
            privateDirectoryPath: _config.publicDirectoryName,
            publicDirectoryPath: _config.publicDirectoryName
        }).object;

        this.build = new Build(optionsWithDefaults.privateDirectoryPath);
        this.publicRootPath = resolve(optionsWithDefaults.publicDirectoryPath);
    }

    public listen(port: number): Promise<void> {
        return new Promise((resolve) => {
            createServer(async (dReq: IncomingMessage, dRes: ServerResponse) => {
                const close = (status: number) => {
                    dRes.statusCode = status;
                    dRes.end();
                }

                if(dReq.method.toUpperCase() !== "GET") return close(405);
                
                const reqUrl: URL = new URL(`http://localhost${dReq.url}`);
                const staticPath: string = join(this.publicRootPath, reqUrl.pathname);
                
                if(!existsSync(staticPath)) {
                    const buildFile = await this.build.retrieve(reqUrl.pathname) as File;
                    if(!buildFile) return close(404);

                    dRes.end(buildFile.contents);
                    
                    return;
                }
                
                dRes.end(readFileSync(staticPath));
            })
		    .listen(port, resolve);
		});
    }
}