const { execSync } = require("child_process");
const { join } = require("path");


execSync("npx tsc ./src/api/api.ts --emitDeclarationOnly --outDir ./typings/", {
    cwd: join(__dirname, "../")
});


console.log("\x1b[31mTypings generated for \x1b[1mapi/api.ts\x1b[0m");