const { ENV.MODE } = require("../../debug/ENV.MODE");

assert("Check if runtime mode has correctly been inferred (assuming PROD)", ENV.MODE.PROD, true);