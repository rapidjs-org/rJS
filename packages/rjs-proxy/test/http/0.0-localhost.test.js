const { embedTestApp } = require("./_embedTestApp");


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
            throw new Error(`[extra] ${
                "Repeated hostname embedding should be rejected."
            }${
                embedErrorMessage ? `\nInstead caught: ${embedErrorMessage}` : ""
            }`);
        }

        // Contextual tests
        new HTTPTest("Embed 'localhost' → GET /")
        .eval("/")
        .expect({
            status: 200
        });
    }
});

// TODO: Add other context