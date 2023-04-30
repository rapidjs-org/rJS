import { Args } from "./Args";


type TCommandHandler = () => void;


export class CLI {

    private static commandHandlers: Map<string, TCommandHandler> = new Map();

    public static registerCommand(name: string, commandHandler: TCommandHandler) {
        this.commandHandlers.set(name, commandHandler);
    }

    public static eval() {
        /*
        * Interpret first positional argument as execution command.
        * Command to depict which functional aspect to perform.
        */
        const commandName: string = Args.global.parsePositional(0);
        const commandHandler: TCommandHandler = this.commandHandlers.get(commandName);
        
        if(commandHandler) {
            commandHandler();

            return;
        }

        // Handle undefined command
        console.log(
            commandName
            ? `Unknown command '${commandName}'`
            : "No command provided"
        );

        process.exit(1);
    }

}