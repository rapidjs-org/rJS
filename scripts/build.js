const { join } = require("path");
const { existsSync, statSync, readFileSync, readdirSync, writeFileSync, rmSync } = require("fs");
const { execSync } = require("child_process");


// TODO: Packages for CLI (standalone, proxy?)


const signatureFilePath = join(process.cwd(), process.argv.slice(2)[0] ?? "./signature.txt");

if(!existsSync(signatureFilePath)) {
    throw new ReferenceError(`Signature file does not exist '${signatureFilePath}'`);
}
if(!statSync(signatureFilePath).isFile()) {
    throw new ReferenceError(`Referenced signature file is not a file '${signatureFilePath}'`);
}

const signature = String(readFileSync(signatureFilePath));
const distPath = join(process.cwd(), "./dist/");
let counter = {
    dirs: 0,
    files: 0
};


rmSync(distPath, {
    force: true,
    recursive: true
});

execSync(`tsc --outDir ${distPath}`, {
    stdio: "inherit"
});


buildDir(distPath);


process.on("exit", _ => {
    console.log(`\x1b[2m•\x1b[0m Project has \x1b[32msuccessfully\x1b[0m built (\x1b[34m${counter.files}\x1b[0m files in \x1b[34m${counter.dirs}\x1b[0m directories)\n`);
});


function buildDir(path) {
    counter.dirs++;

    readdirSync(path, {
        withFileTypes: true
    })
    .forEach(dirent => {
        const subPath = join(path, dirent.name);

        if(dirent.isDirectory()) {
            buildDir(subPath);

            return;
        }

        // TODO Minify / optimize
        counter.files++;
        
        writeFileSync(subPath, `${signature}\n${String(readFileSync(subPath))}`);
    });
}