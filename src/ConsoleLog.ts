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
        ((!Array.isArray(color[0])
        ? [ color ]
        : color) as TColor[])
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
    
    private static write(message: string, groupCount: number, noTypeFormatting: boolean = false): string {   
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
        message = noTypeFormatting
        ? message
        : message.replace(/(^|[^0-9])([0-9]+([.,-][0-9]+)*)([^a-z0-9;]|$)/gi, `$1${ConsoleLog.color("$2", [ 0, 167, 225 ])}$4`); // Number

        message = message.trim();

        message = `${
            ConsoleLog.style(
                ConsoleLog.color(` ${
                    _config.appNameShort
                    .replace("r", ConsoleLog.color("r", [ 255, 97, 97 ]))
                } `, [
                    [ 54, 48, 48 ], [ 255, 254, 173, EColorMode.BG ]
                ]),
                [ 1, 3 ]
            )
        } ${message}\n`;
        
        return (groupCount > 1)
        ? `\x1b[s\x1b[1A\x1b[${
            message
            .split(/\r\n/g)
            .pop()
            .replace(/\x1b\[[0-9;:]+m/g, "")
            .length
        }C\x1b[2m\x1b[31m (${groupCount})\x1b[0m\n\x1b[1B`
        : message;
    }

    public handleStdout(message: string, groupCount: number): string {
        return ConsoleLog.write(message, groupCount);
    }
    public handleStderr(message: string, groupCount: number): string {
        message = ConsoleLog.color(message, [ 224, 0, 0 ]);
        
        return ConsoleLog.write(message, groupCount, true);
    }
    
}