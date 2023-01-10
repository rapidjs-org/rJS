import devConfig from "../_config.json";


import { join } from "path";

import { PORT } from "./PORT";


export function locateSocket(port: number = PORT): string {
    return join(devConfig.socketDir, `${devConfig.socketNamePrefix}${port}.sock`);
}