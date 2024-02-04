import { Context } from "../common/Context";
import { start } from "../proxy/api.proxy";


export default start(Context.CONFIG.get<number>("port"));