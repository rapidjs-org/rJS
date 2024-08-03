import { Args } from "./Args";


type TCommandHandler = () => void;


export class Command {
	private static readonly commandRegistry: Map<number, Map<string, TCommandHandler>> = new Map();

	private static declarePositionalRegistry(positional: number) {
		if(Command.commandRegistry.has(positional)) return;
		
		Command.commandRegistry.set(positional, new Map());
	}

	public static eval(positional: number = 0) {
		const name: string = Args.parsePositional(positional);
		if(!name) {
			throw new SyntaxError(`Missing command (pos ${positional})`);
		}

		Command.declarePositionalRegistry(positional);
		if(!Command.commandRegistry.get(positional).has(name)) {
			throw new SyntaxError(`Unknown command ${name}`);
		}

		Command.commandRegistry.get(positional)
		.get(name)
		.apply(null);
	}

	constructor(name: string, commandHandler: TCommandHandler, positional: number = 0) {
		Command.declarePositionalRegistry(positional);

		Command.commandRegistry.get(positional)
		.set(name, commandHandler);
	}
}