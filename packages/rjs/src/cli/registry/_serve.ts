import { FileServer, createFileServer } from "../../FileServer";
import { DEV_MODE_PREFIX } from "../util";
import { Args } from "../Args";
import { Command } from "../Command";
import { Printer } from "../Printer";


new Command("serve", () => {
	const dev: boolean = Args.parseFlag("dev", "D");
	
	createFileServer({
		dev,

		port: Args.parseOption("port", "P").number(),
		apiDirPath: Args.parseOption("api-dir").string(),
		pluginDirPath: Args.parseOption("plugins-dir").string(),
		publicDirPath: Args.parseOption("public-dir").string()
	})
        .then((server: FileServer) => {
        	Printer.global.stdout(
        		`${
        			dev ? DEV_MODE_PREFIX : ""
        		}Server listening on ${Printer.format(
        			`http://localhost:${server.port}`,
        			[Printer.escapes.TERTIARY_COLOR_FG]
        		)}.`
        	);
        })
        .catch((err: Error) => Printer.global.stderr(err));
});
