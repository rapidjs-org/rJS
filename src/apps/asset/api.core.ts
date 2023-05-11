import { TConcreteAppAPI } from "../../_types";


export let API: TConcreteAppAPI = null;


export function define(apiObj: TConcreteAppAPI) {
    API = apiObj;
}