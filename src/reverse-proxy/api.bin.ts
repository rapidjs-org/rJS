const devConfig = {
    ...require("../dev-config.json")
}


import { Socket, createServer as createUnixSocketServer } from "net";

import { ISpaceEnv } from "../interfaces";

import { bootReverseProxyServer, embedSpace } from "./server";


/* process.on("") */


/* const socketPort: number = 4000;

createUnixSocketServer((connection: Socket) => {
    console.log(connection);

    // TODO: CPP register free here (for all child processes)

    const spaceEnv: ISpaceEnv = {
        PATH: process.cwd(),
        MODE: "{ DEV: true, PROD: false }"
    };   // TODO: Receive spaceEnv (WD/PATH, MODE)

    embedSpace(spaceEnv);
})
.listen(`${devConfig.socketsDirPath}${devConfig.socketFilePrefix}${socketPort}`, () => {
    process.send("socket-listening");
});   // TODO: Infere port form boot data */


bootReverseProxyServer(7070, false);

embedSpace({
    PATH: process.cwd(),
    MODE: { DEV: true, PROD: false }
});