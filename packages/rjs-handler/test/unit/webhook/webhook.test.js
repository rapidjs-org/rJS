const { createHmac } = require("crypto");

const { initHandler, requestWithHandler } = require("../_api");

const SECRET = "secret";
const PAYLOAD = JSON.stringify({
    foo: "bar"
});

const requestWithWebhookHandler = () => {
    return requestWithHandler(
        initHandler(require("path").join(__dirname, "./app")),
        {
            method: "POST",
            url: "/",
            headers: {
                "User-Agent": "GitHub-Hookshot/044aadd",
                "X-Hub-Signature-256": `sha256=${
                    createHmac("sha256", SECRET)
                    .update(PAYLOAD)
                    .digest("hex")
                }`
            },
            body: PAYLOAD
        }, [], true
    );
};

const README_FILE_PATH = require("path").join(__dirname, "./app", "README.md");
const README_OVERRIDE_DATA = "OVERRIDE";
require("fs").writeFileSync(README_FILE_PATH, README_OVERRIDE_DATA);

new UnitTest("POST_ GitHub:/ (dummy)")
.actual(async () => {
    const res = await requestWithWebhookHandler();

    const fileExists = name => {
        return require("fs")
        .existsSync(require("path").join(__dirname, "./app", name));
    }

    new UnitTest("POST GitHub:/ (dummy) → .env (from local)")
    .actual(fileExists(".env"))
    .expect(true);

    new UnitTest("POST GitHub:/ (dummy) → test/file.txt (from remote)")
    .actual(fileExists("test/file.txt"))
    .expect(true);

    new UnitTest("POST GitHub:/ (dummy) ¬ non-existing.txt")
    .actual(fileExists("non-existing.txt"))
    .expect(false);
    
    setTimeout(() => {
        new UnitTest("POST GitHub:/ (dummy) ¬ README.md override")
        .actual(require("fs").readFileSync(README_FILE_PATH).toString().trim() !== README_OVERRIDE_DATA)
        .expect(true);
    }, 750);    // TODO: Improve (reliability)

    return res;
})
.expect({
    status: 200
});