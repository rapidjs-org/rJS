import { join } from "path";
import { homedir } from "os";
import fs from "fs";

import { TJSON } from "../types";


const _config = {
	fsConfigDirName: ".config",
	fsAppConfigDirName: "rjs"
};


// TODO: File watcher (seldomly) to emit offline event of missing (?)


function bindConfigPath(path: string): string {
	if(!path) return null;

	try {
		!fs.existsSync(path)
        && fs.mkdirSync(path, { recursive: true });
		fs.accessSync(path, fs.constants.W_OK);
            
		return path;
	} catch {
		return null;
	}
}


export class PortMemory {
	private static configPath: string = (process.env.CONFIG_PATH
		? bindConfigPath(join(process.env.CONFIG_PATH, _config.fsAppConfigDirName))
		: null
	) ?? (bindConfigPath(join(homedir(), _config.fsConfigDirName, _config.fsAppConfigDirName))
        ?? bindConfigPath(join(process.cwd(), _config.fsConfigDirName, _config.fsAppConfigDirName)));
    
	private static getPortAssociatedPath(associatedPort: number): string {
		return join(PortMemory.configPath, associatedPort.toString());
	}
    
	private static readFromMemory(associatedPort: number): TJSON {
		const path: string = PortMemory.getPortAssociatedPath(associatedPort);
		const serialization: string = fs.existsSync(path) ? fs.readFileSync(path).toString() : "";

		if(!serialization.trim().length) return {};

		try {
			return Object.fromEntries(serialization
			.split(/\n/)
			.map((line: string) => line.split("\t"))
			);
		} catch {
			throw new SyntaxError("Unable to parse port memory serialization");

			// TODO: Shutdown all(?) or recover (?)
		}
	}
    
	private static writeToMemory(associatedPort: number, obj: TJSON) {
		try {
			fs.writeFileSync(PortMemory.getPortAssociatedPath(associatedPort),
				Object.entries(obj)
				.map((value: [ string, string ]) => `${value[0]}\t${value[1]}`)
				.join("\n")
			);
		} catch {
			throw new SyntaxError("Unable to parse port memory serialization");
		}
	}

	public static get(associatedPort: number, key: string): string {
		return PortMemory.readFromMemory(associatedPort)[key] as string;
	}

	public static set(associatedPort: number, key: string, value: unknown) {
		const obj: TJSON = PortMemory.readFromMemory(associatedPort);

		obj[key] = value.toString();

		PortMemory.writeToMemory(associatedPort, obj);
	}

	public static has(associatedPort: number): boolean {
		return fs.existsSync(PortMemory.getPortAssociatedPath(associatedPort));
	}

	public static delete(associatedPort: number, key: string) {
		const obj: TJSON = PortMemory.readFromMemory(associatedPort);

		delete obj[key];
        
		(!Object.keys.length)
			? PortMemory.clear(associatedPort)
			: PortMemory.writeToMemory(associatedPort, obj);
	}

	public static clear(associatedPort: number) {
		fs.rmSync(PortMemory.getPortAssociatedPath(associatedPort), { force: true });

		!(fs.readdirSync(PortMemory.configPath, { withFileTypes: true })
		.filter((dirent: fs.Dirent) => dirent.isFile())
		.filter((dirent: fs.Dirent) => /[0-9]+/.test(dirent.name))
		.length
		) && fs.rmSync(PortMemory.configPath, {
			recursive: true,
			force: true
		});
	}
}