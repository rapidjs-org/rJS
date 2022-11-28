const devConfig = {
    ...require("../dev-config.json")
}


import { Socket, createServer as createUnixSocketServer } from "net";

import { ISpaceEnv } from "../interfaces";

import { embedSpace } from "./server";


const port: number = 4000;

createUnixSocketServer((connection: Socket) => {
    console.log(connection);

    // TODO: CPP register free here (for all child processes)

    const spaceEnv: ISpaceEnv = {
        PATH: process.cwd(),
        MODE: "{ DEV: true, PROD: false }"
    };   // TODO: Receive spaceEnv (WD/PATH, MODE)

    embedSpace(spaceEnv);
})
.listen(`${devConfig.socketsDirPath}${devConfig.socketFilePrefix}${port}`);   // TODO: Infer port form boot data