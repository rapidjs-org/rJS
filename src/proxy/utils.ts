import _config from "../_config.json";


import { join } from "path";


export function locateProxySocket(port: number): string {
    return join(_config.socketDir, `${_config.socketNamePrefix}${port}.sock`);
}