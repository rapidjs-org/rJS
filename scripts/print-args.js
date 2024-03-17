const { join } = require("path");
const { readdir, readFileSync } = require("fs");


const PACKAGE_DIR_PATH = join(__dirname, "../packages/");
const HELP_FILE_PATH = join(DEBUG_DIR_PATH, "./cli/_help.txt");

const EXPRESSION_REGEX = new RegExp(`\\. *(${
    [
        "parsePositional",
        "parseFlag",
        "parseOption"
    ].join("|")
}) *\\( *((["'])[a-zA-Z_-]+\\3|[0-9]+)? *(, *(["'])[a-zA-Z_-]+\\5 *)?\\)`, "g");
const NAME_REGEX = /(["'])[a-zA-Z_-]+\1/;

const usedArgs = [];
const usedArgExpressions = new Set();


console.log("\x1b[1mEFFECTIVE REGEX\x1b[0m:")
console.log(`\x1b[31m${EXPRESSION_REGEX.toString()}\x1b[0m\n`);


process.on("exit", () => {
    console.log("\x1b[1mARGUMENT PARSE EXPRESSIONS\x1b[0m:");

    Array.from(usedArgExpressions)
    .forEach(expression => {
        console.log(`\x1b[2m• \x1b[32m${expression}\x1b[0m`);
    });
    
    console.log("");
    const helpText = readFileSync(HELP_FILE_PATH).toString();
    usedArgs.forEach(usedArg => {
        if(helpText.indexOf(usedArg) >= 0) return;
        console.log(`\x1b[31mArgument '${usedArg}' is not explicitly mentioned in help file text!\x1b[0m`);
    });
});


crawlDirectory(PACKAGE_DIR_PATH);


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

            (readFileSync(filePath).toString().match(EXPRESSION_REGEX) || [])
            .map(match => match.slice(1))
            .forEach(match => {
                usedArgs.push((match.match(NAME_REGEX) || [ "" ])[0].slice(1, -1).trim());
                usedArgExpressions.add(match);
            });
        });
    });
}