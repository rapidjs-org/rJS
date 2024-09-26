import { Command } from "../Command";

new Command(
	"generate",
	() => {
		Command.eval(1, "Name the template to generate.");
	},
	{ aliases: ["gen"] }
);
