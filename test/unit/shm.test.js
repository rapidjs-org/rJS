const { getConcreteAppKey } = require("../../debug/shared-memory/shared-memory-api");


assert("Get unique shared memory app key", getConcreteAppKey(), 3897592908);