"use strict";


const { statSync, readdirSync } = require("fs");
const { join } = require("path");
const { exec } = require("child_process");

const compile = require("./compile");


const compileCPP = process.argv.slice(2).includes("--cpp");

compile.log(`• WATCH COMPILE { ${
    [ "TypeScript" ]
    .concat(compileCPP ? ["C++"] : [])
    .join(", ")
} }`);


let tsLogGroupOpen;
// Start TypeScript compiler (sub-)process in background
const child = exec(`tsc -w --preserveWatchOutput --outDir ${join(__dirname, "../debug/")}`);
// Adopt TypeScript compiler output
child.stdout.on("data", data => {
    if(/[0-9]{2}:[0-9]{2}:[0-9]{2} \- File change detected\. Starting incremental compilation\.\.\./.test(data)
    || /[0-9]{2}:[0-9]{2}:[0-9]{2} \- Starting compilation in watch mode\.\.\./.test(data)) {
        return;
    }
    
    !tsLogGroupOpen
    && compile.logBadge("TypeScript", [ 23, 155, 231 ]);
    console.log(`${
        (tsLogGroupOpen && !/^[0-9]{2}:[0-9]{2}:[0-9]{2} \-/.test(data))
        ? "\n" : ""
    }${
        data.trim()
        .replace(/(^|\n)([^:]+)\(([0-9]+),([0-9]+)\):(.*)/g, (_, indicator, lead, line, pos, trail) => {
            return `${indicator}\x1b[2m(${lead}:${line}:${pos})\x1b[0m${
                trail.replace(/^( *error)/g, "\x1b[31m$1\x1b[30m")
            }`;
        })
        .replace(/((^|\n)[0-9]+:[0-9]+:[0-9]+.*)/g, "\x1b[2m$1\x1b[0m")
    }`);

    tsLogGroupOpen = true;
});


// Set up shared memory files / C++ source modification watch
const shmPath = compile.getSHMPath("./debug/");
const detectionFrequency = 2500;
const shmDirents = readdirSync(shmPath.source, {
    withFileTypes: true
})
.filter(dirent => dirent.isFile())
.filter(dirent => !/\.ts$/.test(dirent.name));

compileCPP
&& setInterval(_ => {
    for(const dirent of shmDirents) {
        if(!shmFileModified(join(shmPath.source, dirent.name))) {
            continue;
        }

        compile.compileCPP("./debug/");

        tsLogGroupOpen = false;

        return;
	}
}, detectionFrequency);

// Initially compile
compile.compile("./debug/");


function shmFileModified(path) {
    const fileModified = time => {
        return (Math.abs(time - Date.now()) < detectionFrequency);
    };

    const stats = statSync(path);

    return (fileModified(stats.birthtime) || fileModified(stats.mtimeMs));
}