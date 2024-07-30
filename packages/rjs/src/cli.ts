import { Command } from "./Command";
import * as api from "./api";


// Lazy dependency install?


new Command("start", api.start);