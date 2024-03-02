import { Args } from "../common/Args";


type TCommandHandler = () => void;


export class CLI {
	private static commandHandlers: Map<string, TCommandHandler> = new Map();

	public static registerCommand(nameOrNames: string|string[], commandHandler: TCommandHandler) {
    	[ nameOrNames ].flat()
    	.forEach((name: string) => {
    		this.commandHandlers.set(name, commandHandler);
    	});
	}

	public static eval(defaultCommandName?: string) {
    	const commandName: string = Args.cli.parsePositional(0);

		const commandHandler: TCommandHandler = this.commandHandlers.get(commandName ?? defaultCommandName);
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

}