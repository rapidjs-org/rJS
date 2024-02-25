require("../../debug/api/api")
.embed(require("path").join(__dirname, "../../test-app/"))
.then(() => process.send("online"))
.catch(err => { throw err; });