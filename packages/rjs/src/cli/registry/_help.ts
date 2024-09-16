import { readFileSync } from "fs";
import { join } from "path";

import { Command } from "../Command";
import { Printer } from "../Printer";

const WEB_URL: string = "https://rapidjs.org";

new Command("help", () => {
	Printer.global.stdout(
		readFileSync(join(__dirname, "../../cli.help.txt"))
			.toString()
			.replace(WEB_URL, Printer.format(WEB_URL, [Printer.escapes.PRIMARY_COLOR_FG], 39))
	);

	process.exit(0);
});
