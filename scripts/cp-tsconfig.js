const { createInterface: createReadline } = require("readline");
const { join } = require("path");
const { readdirSync, statSync, cpSync, readFileSync } = require("fs");


const COMMON_TSCONFIG_PATH = join(__dirname, "../tsconfig/");
const COMMON_TSCONFIGS = readdirSync(COMMON_TSCONFIG_PATH, {
    withFileTypes: true
})
.filter(dirent => dirent.isFile())
.filter(dirent => /^tsconfig(\.[\w\d_-]+)?\.json$/.test(dirent.name))
.map(dirent => {
    const path = join(COMMON_TSCONFIG_PATH, dirent.name);
    return {
        path,
        name: dirent.name,
        mtimeMs: statSync(path).mtimeMs
    };
});
const PACKAGES = readdirSync(join(__dirname, "../packages/"), {
    withFileTypes: true
})
.filter(dirent => dirent.isDirectory())
.map(dirent => {
    return {
        path: join(dirent.parentPath, dirent.name),
        name: dirent.name
    };
});
const READLINE = createReadline(process.stdin, process.stdout);


const nextPackage = () => {
    const package = PACKAGES.shift();
    if(!package) process.exit(0);

    const tsconfigs = Object.assign([], COMMON_TSCONFIGS);
    const nextTsconfig = () => {
        const tsconfig = tsconfigs.shift();
        const targetTsconfigPath = join(package.path, tsconfig.name);

        const skip = () => {
            if(tsconfigs.length) {
                nextTsconfig();
                return;
            }
            console.log(`\x1b[2mCopied common tsconfigs to package \x1b[22m\x1b[32m${package.name}\x1b[30m.\x1b[0m`);

            nextPackage();
        };
        const copy = () => {
            cpSync(tsconfig.path, targetTsconfigPath, {
                force: true
            });

            skip();
        };

        (  (statSync(targetTsconfigPath).mtimeMs > tsconfig.mtimeMs)
        && (readFileSync(tsconfig.path).toString() !== readFileSync(targetTsconfigPath).toString()))
        ? READLINE.question(
            `\n\x1b[2m${targetTsconfigPath}\x1b[22m\n\x1b[31m\x1b[31mSpecific \x1b[1m${tsconfig.name}\x1b[22m is newer than the common version.\nOverwrite?\x1b[30m \x1b[1m[Y/n]\x1b[0m `,
            answer => {
            [ "", "y" ].includes(answer.toLowerCase().trim())
            ? copy()
            : skip();
        })
        : copy();
    };

    nextTsconfig();
};

nextPackage();