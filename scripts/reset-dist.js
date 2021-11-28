const {rmdirSync, mkdirSync} = require("fs");


const distPath = require("./dist-path");

rmdirSync(distPath, {
    recursive: true
});

mkdirSync(distPath);