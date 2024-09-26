import { Dirent, existsSync, readFileSync, readdir } from "fs";
import { join, resolve as resolvePath } from "path";
// import { tmpdir } from "os";

import { TJSON } from "./.shared/global.types";
import { ModuleDependency } from "./.shared/ModuleDependency";
import { AFilesystemNode } from "./AFilesystemNode";
import { Filesystem } from "./Filesystem";
import { Directory } from "./Directory";
import { File } from "./File";

import _config from "./_config.json";

// TODO: DEV mode flag?

type TBuildInterfaceCallable = (
    api: {
        Directory: typeof Directory;
        File: typeof File;
    },
    filesystem: Filesystem,
    configOptions: TJSON,
    specificOptions: {
        [key: string]: unknown;
    },
    dev: boolean
) => AFilesystemNode | AFilesystemNode[];

export class Plugin<O extends { [key: string]: unknown }> {
	public static isPluginDirectory(pluginDirectoryPath: string): boolean {
		try {
			require.resolve(join(pluginDirectoryPath, _config.buildModuleName));
		} catch {
			return false;
		}
		return true;
	}

	private readonly dev: boolean;
	private readonly pluginDirectoryPath: string;

	constructor(pluginDirectoryPath: string, dev: boolean) {
		this.dev = dev;
		this.pluginDirectoryPath = pluginDirectoryPath;
	}

	private resolveBuildConfigPath(): string {
		return resolvePath(
			join(this.pluginDirectoryPath, `${_config.buildConfigName}.json`)
		);
	}

	private fetchBuildConfig(): TJSON {
		const buildConfigPath: string = this.resolveBuildConfigPath();
		return existsSync(buildConfigPath)
			? (JSON.parse(readFileSync(buildConfigPath).toString()) as TJSON)
			: {};
	}

	private resolveBuildModulePath(): string {
		const buildConfig: TJSON = this.fetchBuildConfig();
		const buildModuleReferences: string[] = [
			join(this.pluginDirectoryPath, _config.buildModuleName),
            buildConfig[_config.buildModuleReferenceKey] as string
		];

		let buildModulePath: string;
		while (!buildModulePath && buildModuleReferences.length) {
			const buildModuleReference: string = buildModuleReferences.shift();
			if (!buildModuleReference) continue;
			try {
				buildModulePath = require.resolve(buildModuleReference);
			} catch {}
		}

		if (!buildModulePath || /\.json$/.test(buildModulePath)) return null;

		/* if(buildConfig[_config.buildConfigCommandKeyName]) {
			const temporaryEmitDirectoryPath: string = join(tmpdir(), ".rjs");
			const cmd: string = (buildConfig[_config.buildConfigCommandKeyName] as TSerializable).toString()
			.replace(new RegExp(`${_config.buildConfigCommandPublicToken}`, "g"), temporaryEmitDirectoryPath);
			// TODO: Exec and use intermediate file
		} */

		return buildModulePath;
	}

	private async fetchBuildInterface(): Promise<TBuildInterfaceCallable> {
		const buildModulePath: string = this.resolveBuildModulePath();

		return buildModulePath
			? await new ModuleDependency<TBuildInterfaceCallable>(
				buildModulePath
			).import()
			: () => [];
	}

	private fetchDirectory(relativePath: string = "."): Promise<Directory> {
		return new Promise((resolve, reject) => {
			readdir(
				join(this.pluginDirectoryPath, relativePath),
				{
					withFileTypes: true
				},
				async (err: Error, dirents: Dirent[]) => {
					if (err) {
						reject(err);

						return;
					}

					const fileNodes: AFilesystemNode[] = [];
					for (const dirent of dirents
                        .filter(
                        	(dirent: Dirent) =>
                        		dirent.isDirectory() || dirent.isFile()
                        )
                        .filter((dirent: Dirent) => {
                        	return (
                        		resolvePath(relativePath) !==
                                    resolvePath(".") ||
                                ![
                                	this.resolveBuildConfigPath(),
                                	this.resolveBuildModulePath()
                                ].includes(
                                	resolvePath(
                                		join(
                                			this.pluginDirectoryPath,
                                			relativePath,
                                			dirent.name
                                		)
                                	)
                                )
                        	);
                        })) {
						const relativeChildPath: string = join(
							relativePath,
							dirent.name
						);
						fileNodes.push(
							dirent.isDirectory()
								? await this.fetchDirectory(relativeChildPath)
								: new File(
									relativeChildPath,
									readFileSync(
										join(
											this.pluginDirectoryPath,
											relativeChildPath
										)
									).toString()
								)
						);
					}

					resolve(new Directory(relativePath, fileNodes));
				}
			);
		});
	}

	public async apply(options?: O): Promise<AFilesystemNode[]> {
		// TODO: Optimise (checksum etc.)
		return [
			(await this.fetchBuildInterface())(
				{
					Directory,
					File
				},
				new Filesystem(
					this.pluginDirectoryPath,
					(await this.fetchDirectory()).fileNodes
				),
                (this.fetchBuildConfig().options ?? {}) as TJSON,
                options,
                this.dev
			)
		].flat();
	}
}
