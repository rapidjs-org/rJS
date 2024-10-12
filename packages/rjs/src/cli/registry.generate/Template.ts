import { existsSync, cpSync } from "fs";
import { join, resolve } from "path";

import { Args } from "../Args";
import { Printer } from "../Printer";

// TODO: From remote?
export class Template {
    constructor(templateName: string) {
        const sourcePath: string = join(
            __dirname,
            "../../../templates/",
            templateName
        );
        if (!existsSync(sourcePath)) {
            throw new ReferenceError(
                `Template '${templateName}' does not exist`
            );
        }

        const targetPath: string = join(
            resolve(Args.parseOption("path", "P").string() ?? process.cwd()),
            Args.parseOption("name", "N").string() ?? templateName
        );
        if (existsSync(targetPath)) {
            throw new ReferenceError(`File already exists at ${targetPath}`);
        }

        cpSync(sourcePath, targetPath, {
            recursive: true
        });

        Printer.global.stdout(
            `Template for '${templateName}' generated at ${targetPath}`
        );
    }
}
