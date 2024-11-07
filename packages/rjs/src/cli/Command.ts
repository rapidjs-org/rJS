import { Printer } from "../.shared/Printer";
import { Options } from "../.shared/Options";
import { Args } from "../.shared/Args";

type TCommandHandler = () => void;

interface ICommandOptions {
    aliases?: string[];
    relatedPositionalArg?: number;
}

export class Command {
    private static readonly commandRegistry: Map<
        number,
        Map<string, TCommandHandler>
    > = new Map();
    private static readonly helpHintSequence: string =
        Printer.indentWithBrandSequence("Use command 'help' for help.");

    private static declarePositionalRegistry(relatedPositionalArg: number) {
        if (Command.commandRegistry.has(relatedPositionalArg)) return;

        Command.commandRegistry.set(relatedPositionalArg, new Map());
    }

    public static eval(
        relatedPositionalArg: number = 0,
        purposeDescription?: string
    ) {
        const name: string = Args.parsePositional(relatedPositionalArg);
        if (!name) {
            throw new SyntaxError(
                [
                    `Missing key argument (at position ${relatedPositionalArg})${
                        purposeDescription ? `: ${purposeDescription}` : ""
                    }`,
                    Command.helpHintSequence
                ].join("\n")
            );
        }

        Command.declarePositionalRegistry(relatedPositionalArg);
        if (!Command.commandRegistry.get(relatedPositionalArg).has(name)) {
            throw new SyntaxError(
                [
                    `Unknown key argument '${name}' (at position ${relatedPositionalArg})`,
                    Command.helpHintSequence
                ].join("\n")
            );
        }

        Command.commandRegistry.get(relatedPositionalArg).get(name).apply(null);
    }

    constructor(
        name: string,
        commandHandler: TCommandHandler,
        options?: ICommandOptions
    );
    constructor(
        name: string,
        options: ICommandOptions,
        commandHandler: TCommandHandler
    );
    constructor(
        name: string,
        commandHandlerOrOptions: TCommandHandler | ICommandOptions,
        optionsOrCommandHandler?: ICommandOptions | TCommandHandler
    ) {
        const commandHandler: TCommandHandler = (
            commandHandlerOrOptions instanceof Function
                ? commandHandlerOrOptions
                : optionsOrCommandHandler
        ) as TCommandHandler;
        const options: ICommandOptions | undefined = (
            commandHandlerOrOptions instanceof Function
                ? optionsOrCommandHandler
                : commandHandlerOrOptions
        ) as ICommandOptions;

        const optionsWithDefaults: ICommandOptions =
            new Options<ICommandOptions>(options, {
                aliases: [],
                relatedPositionalArg: 0
            }).object;

        Command.declarePositionalRegistry(
            optionsWithDefaults.relatedPositionalArg
        );

        [name, optionsWithDefaults.aliases].flat().forEach((name: string) => {
            Command.commandRegistry
                .get(optionsWithDefaults.relatedPositionalArg)
                .set(name, commandHandler);
        });
    }
}
