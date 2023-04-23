/* 
public readonly args: string[];
    public readonly concreteAppModulePath: string;
    public readonly hostnames: string[];
    public readonly isSecure: boolean;
    public readonly port: number;
    public readonly path: string;
    public readonly mode: {
        DEV: boolean;
        PROD: boolean;
    };
 */
const { EmbedContext } = require("../../../debug/core/EmbedContext");


const args = [
    "cmd", "./concrete.js", "-H", "hostname1,hostname2", "--port", 81, "-S", "-W", "./app/", "-D"
];
const embedContext = new EmbedContext(args);


//frame("Specific", () => {

    assertEquals("Args array", embedContext.args, args);
    assertEquals("Concrete app path", embedContext.concreteAppModulePath, args[1]);
    assertEquals("Hostnames", embedContext.concreteAppModulePath, args[3].split(","));

//});