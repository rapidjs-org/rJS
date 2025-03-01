import { fs, path } from "@rapidjs.org/adapters";

import _config from "./config.json" with { type: "json" };

type TContextConfig = {
    plugins?: string|string[];
};

// TODO: Always try re-emit in dev, only try re-emit on hook event in prod
// TODO: Plugin read modes: independent public files, or interdependent public files (default) 

export async function emit(sourcePath: string = _config.defaultSourcePath, publicPath: string = _config.defaultPublicPath) {
    const stats: fs.TStats = await fs.stat(sourcePath);

    if(!stats.isDirectory)
        throw new TypeError("Source is not a directory");
    
    // TODO: Delete old files, no dangling files?
    await fs.rm(publicPath, {
        recursive: true
    });
    await fs.mkdir(publicPath, {
        recursive: true
    });

    // Source dir
    (await fs.readDir(sourcePath))
        .forEach(async (dirent: fs.TDirent) => {
            if(!dirent.isDirectory) return;   // TODO: Lint warning?

            // Source context dir
            const contextPath: string = await path.join(sourcePath, dirent.name);
            const contextConfigPath: string = await path.join(contextPath, _config.sourceContextConfigName);    // TODO: Support more than JSON
            const contextConfig: TContextConfig = await fs.exists(contextConfigPath)
                ? await import(contextConfigPath)
                : {};
            
            const pluginReferences: string[] = [ contextConfig.plugins ?? [] ].flat();

            // If no plugin to apply is configured, emit file identity
            if(!contextConfig.plugins) {
                emitIdentity(contextPath, publicPath);

                return;
            }
            
            pluginReferences
                .forEach((pluginReference: string) => {
                    console.warn("...");
                });
        });
}   // TODO: Return build info (file count, hashes, etc.)?

// TODO: Private files?
// __plugin/ for in-place plugins?
async function emitIdentity(sourcePath: string, publicPath: string) {
    (await fs.readDir(sourcePath))
        .forEach(async (dirent: fs.TDirent) => {
            const direntSourcePath: string = await path.join(sourcePath, dirent.name);
            const direntPublicPath: string = await path.join(publicPath, dirent.name);
            
            dirent.isDirectory
                ? emitIdentity(direntSourcePath, direntPublicPath)
                : fs.copyFile(direntSourcePath, direntPublicPath);
        });
}

function emitWithPlugin(pluginReference: string, sourcePath: string, publicPath: string) {

}