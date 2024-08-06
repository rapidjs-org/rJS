const { embedTestApp, monitor } = require("./_api");


embedTestApp("localhost")
.then(async () => {
    // Workaround (enhance testing framework)
    let embedErrorMessage;
    try {
        await embedTestApp("localhost");
    } catch(err) {
        embedErrorMessage = err.message ?? err;
    } finally {
        if(embedErrorMessage !== "Hostname(s) already bound to proxy") {
            throw new Error(`[A1] ${
                "Repeated hostname embedding should be rejected."
            }${
                embedErrorMessage ? `\nInstead caught: ${embedErrorMessage}` : ""
            }`);
        }
        
        try {
            await embedTestApp("example.org", [ "test.example.org", "example.com" ]); // TODO: Test availability
        } catch(err) {
            throw new Error(`[A2] ${[
                "Additional hostname embedding should not be rejected.",
                `Instead caught: ${err.message ?? err}`
            ].join("\n")}`);
        } finally {
            new HTTPTest("Embed 'localhost' → GET /")
            .eval("/")
            .expect({
                status: 200
            });
        }
    }
});