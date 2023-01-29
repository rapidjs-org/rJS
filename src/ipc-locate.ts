import devConfig from "./_config.json";


import { join } from "path";


export function locateIPC(port: number): string {
    return join(devConfig.socketDir, `${devConfig.socketNamePrefix}${port}.sock`);
}