import { readFileSync } from "fs";
import { join } from "path";

import { Command } from "../Command";
import { Printer } from "../Printer";


function copyTemplate(templateName: string, targetPath: string) {
    // TODO
}


new Command("generate", () => {
    Command.eval(1);
});


// Generate utility sub commands (pos 1)
new Command("help", () => {
    Printer.global.stdout(readFileSync(join(__dirname, "../../cli.gen.help.txt")).toString());
    
    process.exit(0);
}, 1);

new Command("instance", () => {
    // TODO
}, 1);