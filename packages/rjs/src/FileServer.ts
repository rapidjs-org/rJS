import { Options } from "./.shared/Options";

import { IServerOptions, Server } from "@rapidjs.org/rjs-server";

import _config from "./_config.json";

export function createFileServer(
	options: Partial<IServerOptions>
): Promise<FileServer> {
	return new Promise((resolve) => {
		const server: FileServer = new FileServer(options);
		server
        .on("online", () => resolve(server));
	});
}

export class FileServer extends Server {
	constructor(options?: Partial<IServerOptions>) {
		super(
			new Options<Partial<IServerOptions>>(options, {
				apiDirPath: _config.apiDirName,
				pluginDirPath: _config.pluginDirName,
				publicDirPath: _config.publicDirName
			}).object
		);
	}
}
