const {readdirSync, readFileSync, writeFileSync} = require("fs");
const {join, extname} = require("path");
const UglifyJS = require("uglify-js");

const relevantFileTypes = ["js", "json"];

minify(require("./dist-path"));


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
        console.log(join(SOURCE_PATH, path, dirent.name));
        switch(fileType) {
            case "js":
                code = UglifyJS.minify(code).code.replace(/\s+/g, " ");

                // Insert signature at top of each code file
                code =
`/**
 * Test signature.
 */
${code}`;

                break;
            case "json":
                code = code.replace(/([{:,])\s+(["'}])/, "$1$2");

                break;
        }

        writeFileSync(curPath, code);
    });
}