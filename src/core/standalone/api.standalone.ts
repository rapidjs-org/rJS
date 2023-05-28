/**
 * Standalone server API module. Provides single process
 * server application operation capabilities for atomic
 * deployment instances.
 */


import _config from "../_config.json";


import { Socket } from "net";
import { join } from "path";
import { cpus } from "os";

import { IBasicRequest } from "../../_interfaces";
import { Args } from "../../Args";

import { HTTPServer } from "../HTTPServer";
import { UnixServer } from "../UnixServer";
import { LogFile } from "../LogFile";
import { ErrorControl } from "../ErrorControl";
import { EmbedContext } from "../EmbedContext";
import { ProcessPool } from "../ProcessPool";
import { handleRequest } from "../process/api.process";


/**
 * Create the standalone web server instance.
 */
export async function serve() {   
    new ErrorControl();
    
    try {
        await UnixServer.message(EmbedContext.global.port, "monitor");

        throw new RangeError(`Port is occupied by proxy :${EmbedContext.global.port}`);
        // TODO: Prompt if to embed into proxy (and vice versa: exisiting standlone into new proxy)???
        // OR: Use standlone always first, but add proxy cluster automatically in case additional app is started???
    } catch {}

    let handle: ((iReq: IBasicRequest, socket: Socket) => void);
    if(cpus().length > 1) {
        const processPool: ProcessPool = new ProcessPool(join(__dirname, "../process/api.process"));
        
        processPool.on("stdout", (message: string) => console.log(message));
        processPool.on("stderr", (err: string) => console.error(err));
        
        processPool.init();

        handle = (iReq, socket) => {
            processPool.assign({
                iReq, socket
            });
        };
    } else {
        handle = handleRequest;
    }
    
    try {
        const server = new HTTPServer(handle, () => {
            const logsDirPath: string = Args.global.parseOption("logs").string;
            logsDirPath
            && new LogFile(join(EmbedContext.global.path, logsDirPath));

            console.log("Started standalone application cluster");
        });

        EmbedContext.global.isSecure
        && server.setSecureContext(EmbedContext.global.hostnames, join(EmbedContext.global.path, Args.global.parseOption("ssl").string ?? _config.sslDir));
    } catch(err) {
        throw new Error(`Could not start application:\n${err.message}`);
    }
}