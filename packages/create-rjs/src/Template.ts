import { rmSync, writeFileSync } from "fs";
import { resolve as resolvePath } from "path";
import { IncomingMessage } from "http";
import { get } from "https";

import { Tar } from "./.shared/Tar";

const _config = {
    tempTarName: "__repo.tar.gz"
};

export class Template {
    private static ghOrgName: string = "rapidjs-org";
    private static ghMainBranchName: string = "main";

    public static instances: Map<string, Template> = new Map();

    private readonly name: string;
    private readonly ghRepoName: string;

    constructor(name: string, ghRepoName: string) {
        this.name = name;
        this.ghRepoName = ghRepoName;

        Template.instances.set(name, this);
    }

    public copy(): Promise<void> {
        return new Promise((resolve, reject) => {
            get(
                [
                    "https://github.com",
                    Template.ghOrgName,
                    this.ghRepoName,
                    "archive/refs/heads",
                    `${Template.ghMainBranchName}.tar.gz`
                ].join("/"),
                (res: IncomingMessage) => {
                    if (res.statusCode !== 302) {
                        throw new Error(
                            `Cannot download template (${res.statusCode})`
                        );
                    }

                    get(res.headers["location"], (res: IncomingMessage) => {
                        const tarBody: Buffer[] = [];
                        res.on("data", (chunk: Buffer) => {
                            tarBody.push(chunk);
                        });
                        res.on("end", () => {
                            const tar: Buffer = Buffer.concat(tarBody);
                            const tarPath: string = resolvePath(
                                _config.tempTarName
                            );

                            writeFileSync(tarPath, tar);

                            new Tar(tarPath)
                                .extract(process.cwd(), this.name)
                                .finally(() => {
                                    rmSync(tarPath);

                                    resolve();
                                });
                        });
                        res.on("error", reject);
                    });
                }
            );
        });
    }
}
