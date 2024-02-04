import { join } from "path";
import { homedir } from "os";
import { existsSync, mkdirSync, accessSync, constants as FS_CONST } from "fs";


const _config = {
    fsConfigDirName: ".config"
};


const XDG_CONFIG_PATH: string = bindConfigPath(process.env.XDG_CONFIG_PATH)
    ?? (bindConfigPath(join(homedir(), _config.fsConfigDirName))
        ?? bindConfigPath(join(process.cwd(), _config.fsConfigDirName)));


function bindConfigPath(path: string): string {
    if(!path) return null;

    !existsSync(path)
    && mkdirSync(path, { recursive: true });

    try {
        accessSync(path, FS_CONST.W_OK);
        
        return path;
    } catch {
        return null;
    }
}


export class SerialMemory {
    
}