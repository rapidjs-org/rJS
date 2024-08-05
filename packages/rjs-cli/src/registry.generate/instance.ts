import { Command } from "../Command";
import { Template } from "../Template";


new Command("instance", () => {
    new Template("instance");
}, 1);