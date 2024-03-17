var _a, _b;
import { join } from "path";
import { homedir } from "os";
import fs from "fs";
const _config = {
    fsConfigDirName: ".config",
    fsAppConfigDirName: "rjs"
};
// TODO: File watcher (seldomly) to emit offline event of missing (?)
function bindConfigPath(path) {
    if (!path)
        return null;
    try {
        !fs.existsSync(path)
            && fs.mkdirSync(path, { recursive: true });
        fs.accessSync(path, fs.constants.W_OK);
        return path;
    }
    catch (_a) {
        return null;
    }
}
export class PortMemory {
    static getPortAssociatedPath(associatedPort) {
        return join(PortMemory.configPath, associatedPort.toString());
    }
    static readFromMemory(associatedPort) {
        const path = PortMemory.getPortAssociatedPath(associatedPort);
        const serialization = fs.existsSync(path) ? fs.readFileSync(path).toString() : "";
        if (!serialization.trim().length)
            return {};
        try {
            return Object.fromEntries(serialization
                .split(/\n/)
                .map((line) => line.split("\t")));
        }
        catch (_a) {
            throw new SyntaxError("Unable to parse port memory serialization");
            // TODO: Shutdown all(?) or recover (?)
        }
    }
    static writeToMemory(associatedPort, obj) {
        try {
            fs.writeFileSync(PortMemory.getPortAssociatedPath(associatedPort), Object.entries(obj)
                .map((value) => `${value[0]}\t${value[1]}`)
                .join("\n"));
        }
        catch (_a) {
            throw new SyntaxError("Unable to parse port memory serialization");
        }
    }
    static get(associatedPort, key) {
        return PortMemory.readFromMemory(associatedPort)[key];
    }
    static set(associatedPort, key, value) {
        const obj = PortMemory.readFromMemory(associatedPort);
        obj[key] = value.toString();
        PortMemory.writeToMemory(associatedPort, obj);
    }
    static has(associatedPort) {
        return fs.existsSync(PortMemory.getPortAssociatedPath(associatedPort));
    }
    static delete(associatedPort, key) {
        const obj = PortMemory.readFromMemory(associatedPort);
        delete obj[key];
        (!Object.keys.length)
            ? PortMemory.clear(associatedPort)
            : PortMemory.writeToMemory(associatedPort, obj);
    }
    static clear(associatedPort) {
        fs.rmSync(PortMemory.getPortAssociatedPath(associatedPort), { force: true });
        !(fs.readdirSync(PortMemory.configPath, { withFileTypes: true })
            .filter((dirent) => dirent.isFile())
            .filter((dirent) => /[0-9]+/.test(dirent.name))
            .length) && fs.rmSync(PortMemory.configPath, {
            recursive: true,
            force: true
        });
    }
}
PortMemory.configPath = (_a = (process.env.CONFIG_PATH
    ? bindConfigPath(join(process.env.CONFIG_PATH, _config.fsAppConfigDirName))
    : null)) !== null && _a !== void 0 ? _a : ((_b = bindConfigPath(join(homedir(), _config.fsConfigDirName, _config.fsAppConfigDirName))) !== null && _b !== void 0 ? _b : bindConfigPath(join(process.cwd(), _config.fsConfigDirName, _config.fsAppConfigDirName)));
