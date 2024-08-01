import { Args } from "./Args";


type TCommandHandler = () => void;


export class Command {
	private static readonly commandRegistry: Map<string, TCommandHandler> = new Map();

	public static eval() {
		const name: string = Args.parsePositional(0);

		if(!name) {
			throw new SyntaxError("Missing command (pos 0)");
		}
		if(!Command.commandRegistry.has(name)) {
			throw new SyntaxError(`Unknown command ${name}`);
		}

		Command.commandRegistry.get(name)();
	}

	constructor(name: string, commandHandler: TCommandHandler) {
		Command.commandRegistry.set(name, commandHandler);
	}
}