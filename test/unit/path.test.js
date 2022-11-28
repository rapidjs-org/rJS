const { join } = require("path");


const { ENV.PATH } = require("../../debug/ENV.PATH");

assert("Check if project path has correctly been constructed", ENV.PATH, resolve("../.tmp"));