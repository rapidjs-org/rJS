/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
module.exports={isDevMode:require("../utilities/is-dev-mode"),ClientError:require("./ResponseError/ClientError").ClientError,ServerError:require("./ResponseError/ServerError").ServerError,Cache:require("../server/cache/ArbitraryCache").ArbitraryCache,file:require("./file")};