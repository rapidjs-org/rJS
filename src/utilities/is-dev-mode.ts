/**
 * Retrieve whether the environment has been started in DEV MODE.
 */


import {argument} from "../args";


export default argument("dev")
? true
: false;