import { readdirSync, Dirent } from "fs";
import { join } from "path";

import { Template } from "./Template";

readdirSync(join(__dirname, "./templates"), {
    withFileTypes: true
})
    .filter((dirent: Dirent) => /^_[a-z0-9_-]+(\.js)?$/.test(dirent.name))
    .forEach((dirent: Dirent) => {
        require(
            join(
                dirent.parentPath,
                dirent.name,
                dirent.isDirectory() ? dirent.name : ""
            )
        );
    });

export async function create(templateName: string) {
    if (!templateName)
        throw new SyntaxError(`Missing template name argument (pos 0)`);
    if (!Template.instances.has(templateName))
        throw new SyntaxError(`Unknown template '${templateName}'`);

    await Template.instances.get(templateName).copy();
}
