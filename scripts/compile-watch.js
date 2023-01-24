"use strict";


const { existsSync, mkdirSync, linkSync, copyFileSync, statSync, readdirSync, rmSync } = require("fs");
const { join, dirname } = require("path");
const { exec, execSync } = require("child_process");


const activeLangs = [ "TypeScript" ];
process.argv.slice(2).includes("--cpp")
&& activeLangs.push("C++");


log(`• WATCH COMPILE { ${activeLangs.join(", ")} }`);


// Create /debug files directory
const shmPath = {
    source: join(__dirname, "../src/shared-memory"),
    debug: join(__dirname, "../debug/shared-memory")
};

makeDir(shmPath.debug);

const helpTextPath = {
    source: join(__dirname, "../src/bin/_help.txt"),
    debug: join(__dirname, "../debug/bin/_help.txt")
};

makeDir(dirname(helpTextPath.debug));
!existsSync(helpTextPath.debug)
&& linkSync(helpTextPath.source, helpTextPath.debug);


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
    && logBadge("TypeScript", [ 23, 155, 231 ]);
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
const detectionFrequency = 2500;;
const shmDirents = readdirSync(shmPath.source, {
    withFileTypes: true
})
.filter(dirent => dirent.isFile())
.filter(dirent => !/\.ts$/.test(dirent.name));

activeLangs.includes("C++")
&& setInterval(_ => {
    for(const dirent of shmDirents) {
        if(!shmFileModified(join(shmPath.source, dirent.name))) {
            continue;
        }

        compileCPP();

        return;
	}
}, detectionFrequency);

// Initially compile C++ source
compileCPP();


function log(message) {
    process.stdout.write(`\x1b[2m${message}\n${Array.from({ length: message.length }, _ => "‾").join("")}\x1b[0m`);
}

function logBadge(message, colorRgb) {
    console.log(`\n\x1b[1m\x1b[48;2;${colorRgb[0]};${colorRgb[1]};${colorRgb[2]}m\x1b[38;2;255;255;255m ${message} \x1b[0m\n`);
}


function compileCPP() {
    logBadge("C++", [ 220, 65, 127 ]);

    try {
        console.log(join(shmPath.source))
        execSync("node-gyp build", {
            cwd: join(shmPath.source),
            stdio: "inherit"
        });
        
        const destPath = join(shmPath.debug, "./shared-memory.node");
        rmSync(destPath, {
            force: true
        });
        copyFileSync(join(shmPath.source, "./build/Release/shared_memory.node"),
                     destPath);
    } catch(err) {
        console.log(err);
    }

    tsLogGroupOpen = false;
}

function shmFileModified(path) {
    const fileModified = time => {
        return (Math.abs(time - Date.now()) < detectionFrequency);
    };

    const stats = statSync(path);

    return (fileModified(stats.birthtime) || fileModified(stats.mtimeMs));
}

function makeDir(path) {
    !existsSync(path)
    && mkdirSync(path, {
        force: true,
        recursive: true
    });
}