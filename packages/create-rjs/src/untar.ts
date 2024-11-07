import { mkdirSync, renameSync, existsSync } from "fs";
import { join } from "path";
import { exec, execSync } from "child_process";

export function untar(
    sourcePath: string,
    targetPath: string,
    parentDirName?: string
): Promise<void> {
    return new Promise((resolve, reject) => {
        const namedTargetPath: string = join(targetPath, parentDirName);
        if (existsSync(namedTargetPath))
            throw new ReferenceError(
                `Target directory already exists '${namedTargetPath}'`
            );

        mkdirSync(targetPath, {
            recursive: true
        });

        const curParentDirName = execSync(`tar -tf ${sourcePath}`)
            .toString()
            .split(/\n/)
            .shift()
            .replace(/\/$/, "");
        exec(
            `tar -xf ${sourcePath} -C ${targetPath}`,
            (err: Error, stdout: string, stderr: string) => {
                err && reject(err);
                if (err) return;

                if (parentDirName) {
                    try {
                        renameSync(
                            join(targetPath, curParentDirName),
                            namedTargetPath
                        );
                    } catch (err) {
                        console.log(err);
                    }
                }

                stdout && console.log(stdout);
                stderr && console.log(stderr);

                resolve();
            }
        );
    });
}
