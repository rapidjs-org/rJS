import _config from "./_config.json";


import { ALogIntercept } from "./ALogIntercept";


/*
 * RGB color triple (4-tuple with optional coloring mode { FG, BG }).
 */
type TColor = [ number, number, number, (boolean|EColorMode)? ];

enum EColorMode {
    FG = 0,
    BG = 1
}


export class ConsoleLog extends ALogIntercept {

    private static color(str: string, color: TColor|TColor[]): string {
        [ color ].flat()
        .forEach((c: TColor) => {
            const colorMode: number = ((c.length > 3) ? c.pop() : false) ? 48 : 38;

            str = `\x1b[${colorMode};2;${c[0]};${c[1]};${c[2]}m${str}\x1b[${colorMode + 1}m`;   // TODO: Why does .join(";") fail?
        });

        return str;
    }

    private static style(str: string, style: number|number[]): string {
        [ style ].flat()
        .forEach((style: number) => {
            str = `\x1b[${style}m${str}\x1b[0m`;
        });

        return str;
    }
    
    private static write(message: string): string {   
        // Type based indentation
        try {
            JSON.parse(message);
            
            // TODO: Object
            /* info({
                "foo": true,
                bar: 12341,
                baz: 'hello world {',
                cuux: [
                    {
                        'zip': "hello \" universe"
                    }
                ]
            }); */
        } catch { /**/ }

        // Type based highlighting
        message = message
        .replace(/(^|\s|[[(])([0-9]+([.,-][0-9]+)*)(\s|[^a-z0-9;]|$)/gi, `$1${ConsoleLog.color("$2", [ 0, 167, 225 ])}$4`); // Number

        return `${
            ConsoleLog.style(
                ConsoleLog.color(` ${
                    _config.appNameShort
                    .replace("r", "\x1b[38;2;255;97;97mr\x1b[39m")
                } `, [
                    [ 54, 48, 48 ], [ 255, 254, 173, EColorMode.BG ]
                ]),
                [ 1, 3 ]
            )
        } ${message}`;
    }

    protected handleStdout(data: string): string {
        return ConsoleLog.write(data);
    }
    protected handleStderr(data: string): string {
        data = ConsoleLog.color(data, [ 224, 0, 0, EColorMode.FG ]);
        
        return ConsoleLog.write(data);
    }
    
}