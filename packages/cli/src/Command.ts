import { Args } from "./Args";


type TCommandCallback = () => void;


export class Command {
	private static registry: Map<string, TCommandCallback> = new Map();

	public static eval(defaultCommandName?: string) {
    	const commandName: string = Args.cli.parsePositional(0);

		const commandHandler: TCommandCallback = Command.registry.get(commandName ?? defaultCommandName);
    	if(commandHandler) {
			try {
				const exitCode: number|void = commandHandler();
				
				(typeof(exitCode) === "number")
				&& setImmediate(() => process.exit(exitCode));
			} catch(err: unknown) {
				console.error(err.toString());

				setImmediate(() => process.exit(1));
			}
			
    		return;
    	}

    	// Handle undefined command
    	console.error(
    		commandName
				? `Unknown command '${commandName}'`
				: "No command provided"
    	);

    	setImmediate(() => process.exit(1));
	}
	
	constructor(nameOrNames: string|string[], commandHandler: TCommandCallback) {
    	[ nameOrNames ].flat()
    	.forEach((name: string) => {
    		Command.registry.set(name, commandHandler);
    	});
	}

}