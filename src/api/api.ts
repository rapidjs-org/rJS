import proxy from "../proxy/api.proxy";


export { default as default } from "../proxy/api.proxy";


proxy.on("online", () => process.send("online"));