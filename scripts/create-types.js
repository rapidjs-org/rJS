"use strict";


const { join } = require("path");
const { existsSync, rmdirSync, mkdirSync, readdirSync, writeFileSync } = require("fs");
const { execSync } = require("child_process");


const typingsPath = join(process.cwd(), "./types/");


function makeDir(path) {
    existsSync(path)
    && rmdirSync(path, {
        force: true,
        recursive: true
    });
    mkdirSync(path, {
        force: true,
        recursive: true
    });
}


module.exports.create = () => {
    makeDir(typingsPath);

    execSync(`tsc ./dist/core/thread/api.concrete.js --declaration --allowJs --emitDeclarationOnly --outDir ${typingsPath}`, {
        stdio: "inherit"
    });

    let references = "";
    const traverse = (path = "./") => {
        readdirSync(join(typingsPath, path), {
            withFileTypes: true
        })
        .forEach(dirent => {
            const subPath = join(path, dirent.name);

            if(dirent.isDirectory()) {
                traverse(subPath);

                return;
            }

            if(!/\.d\.ts$/.test/dirent.name) return;
            
            references += `/// <reference path="${subPath}" />\n`;
        });
    };

    traverse();

    writeFileSync(join(typingsPath, "./index.d.ts"), references.trim());
};