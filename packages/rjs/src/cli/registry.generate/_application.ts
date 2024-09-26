import { Command } from "../Command";
import { Template } from "./Template";

new Command(
    "instance",
    () => {
        new Template("application");
    },
    {
        aliases: ["app"],
        relatedPositionalArg: 1
    }
);
