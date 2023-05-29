const { join } = require("path");
const { existsSync, statSync, readFileSync, readdirSync, writeFileSync, rmSync } = require("fs");
const { execSync } = require("child_process");

const compile = require("./compile");


const signatureFilePath = join(process.cwd(), process.argv.slice(2)[0] ?? "./signature.txt");
if(!existsSync(signatureFilePath)) {
    throw new ReferenceError(`Signature file does not exist '${signatureFilePath}'`);
}
if(!statSync(signatureFilePath).isFile()) {
    throw new ReferenceError(`Referenced signature file is not a file '${signatureFilePath}'`);
}
const signature = String(readFileSync(signatureFilePath));
const distPath = join(__dirname, "../dist/");
let counter = {
    dirs: 0,
    files: 0
};


compile.log("• DISTRIBUTABLE COMPILE");


compile.compile("./dist/")
&& terminateWithError();

try {
    compile.logBadge("TypeScript", [ 23, 155, 231 ]);
    execSync(`tsc --outDir ${distPath}`, {
        stdio: "inherit"
    });
} catch(err) {
    console.log("");

    terminateWithError();
}


// Prepare individual files (signature injection, ...)
buildDir(distPath);


console.log(`\x1b[2m•\x1b[0m Project has \x1b[32msuccessfully\x1b[0m built (\x1b[34m${counter.files}\x1b[0m files in \x1b[34m${counter.dirs}\x1b[0m directories)\n`);


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

function terminateWithError() {
    console.error(`\x1b[2m•\x1b[0m Project has \x1b[31mfailed\x1b[0m to built\n`);

    process.exit(1);
}