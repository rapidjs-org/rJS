export const __esModule: boolean;
/**
 * Class representing both a single plug-in abstraction and
 * a static cumulative management interface providing a
 * comprehensive interface for plug-in implementation within
 * the conrete server application.
 */
export class Plugin {
    static forEach(loopCallback: any): void;
    static load(): void;
    static iterate(callback: any): void;
    constructor(name: any);
    name: any;
    config: Config_1.Config;
    VFS: VFS_1.VFS;
}
export namespace Plugin {
    const pluginsDirPath: string;
    const config: Config_1.Config;
    const registry: Map<any, any>;
}
import Config_1 = require("../Config");
import VFS_1 = require("./VFS");
