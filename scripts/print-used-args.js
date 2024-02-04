const { join } = require("path");
const { readdir, readFileSync } = require("fs");


const DEBUG_DIR_NAME = "debug";
const DEBUG_DIR_PATH = join(__dirname, "../", DEBUG_DIR_NAME);

const PARSE_REGEX = new RegExp(`[^a-zA-Z]${
    "Args"
} *\\. *(${
    [
        "parsePositional",
        "parseFlag",
        "parseOption"
    ].join("|")
}) *\\( *((["'])[a-zA-Z_-]+\\3|[0-9]+)? *(, *(["'])[a-zA-Z_-]+\\5 *)?\\)`, "g");

const usedArgExpressions = new Set();


console.log("\x1b[1mEFFECTIVE REGEX\x1b[0m:")
console.log(`\x1b[31m${PARSE_REGEX.toString()}\x1b[0m\n`);

process.on("exit", () => {
    console.log("\x1b[1mARGUMENT PARSE EXPRESSIONS\x1b[0m:")
    Array.from(usedArgExpressions)
    .forEach(expression => {
        console.log(`\x1b[2m• \x1b[32m${expression}\x1b[0m`);
    });
})

crawlDirectory(DEBUG_DIR_PATH);


function crawlDirectory(path) {
    readdir(path, {
        withFileTypes: true
    }, (err, dirents) => {
        if(err) throw err;

        dirents.forEach(dirent => {
            const filePath = join(path, dirent.name);
            if(dirent.isDirectory()) {
                crawlDirectory(filePath);
                return;
            }

            if(!/\.[jt]s$/.test(dirent.name)) return;

            (readFileSync(filePath).toString().match(PARSE_REGEX) || [])
            .map(match => match.slice(1))
            .map(match => match.slice(match.indexOf(".") + 1))
            .forEach(match => usedArgExpressions.add(match));
        });
    });
}