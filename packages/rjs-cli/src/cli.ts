import { Dirent, readdirSync } from "fs";
import { join } from "path";

import { Command } from "./Command";
import { Printer } from "./Printer";


const printer: Printer = new Printer();


process.on("uncaughtException", (err: Error) => {
    printer.stderr(err, {
        replicatedMessage: true
    });
    
    process.exit(1);
});


printer.stdout("Test");

// Dynamically load command registry definitions
readdirSync(join(__dirname, "./commands/"), {
    withFileTypes: true
})
.filter((dirent: Dirent) => /\.js$/.test(dirent.name))
.forEach((dirent: Dirent) => require(join(dirent.path, dirent.name)));


// Execute targeted command handler
Command.eval();