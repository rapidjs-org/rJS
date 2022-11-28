const devConfig = {
    ...require("../dev-config.json")
}


import { createConnection as createUnixSocketConnection } from "net";

import { ISpaceEnv } from "../interfaces";

import { MODE } from "./MODE";
import { PATH } from "./PATH";


export function embedSpace() {
    const spaceEnv: ISpaceEnv = {
        PATH: PATH,
        MODE: JSON.stringify(MODE)
    }   // TODO: Determine correctly
    
    const client = createUnixSocketConnection("/tmp/mysocket");

    client.on("connect", () => {
        // TODO: Unavailable?
    });

    client.on("writable", () => {
        client.end(Buffer.from(JSON.stringify(spaceEnv)));
    });
    
    // ...
    // TODO: Send to proxy (with or after boot)
}

// TODO: Regularly check for proxy to still exist unless intentional shutdown (use socket fikles for validation?)