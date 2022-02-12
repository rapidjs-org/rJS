const { readdirSync, readFileSync, writeFileSync } = require("fs");
const { join, extname } = require("path");
const UglifyJS = require("uglify-js");


const relevantFileTypes = ["js", "json"];
const signature = String(readFileSync(join(__dirname, "code-signature")));

let totalFiles = 0;

// Minify /dist directory
minify(join(__dirname, "../dist"));

console.log(`> Build completed (${totalFiles} files affected).`);

/**
 * Minify script files (recursively).
 * Maintain identifiers and file system structure.
 * @param {String} path Directory to apply minification on
 */
function minify(path) {
    readdirSync(path, {
        withFileTypes: true
    })
    .forEach(dirent => {
        const curPath = join(path, dirent.name);

        if(dirent.isDirectory()) {
            return minify(curPath);
        }

        const fileType = extname(dirent.name).slice(1).toLowerCase();
        if(!relevantFileTypes.includes(fileType)) {
            return;
        }

        let code = String(readFileSync(curPath));
        
        switch(fileType) {
            case "js":
                // TODO: Keep signatue comments?
                code = UglifyJS.minify(code).code.replace(/\s+/g, " ");

                // Insert signature at top of each code file
                code = `${signature}\n${code}`;

                break;
            
            case "json":
                code = code
                .replace(/([{:,])\s+(["'}])/g, "$1$2")
                .replace(/\s*\}$/, "}");

                break;
        }

        writeFileSync(curPath, code);

        totalFiles++;
    });
}