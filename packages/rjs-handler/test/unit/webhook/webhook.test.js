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
                    require("crypto").
                    createHmac("sha256", SECRET)
                    .update(PAYLOAD)
                    .digest("hex")
                }`
            },
            body: PAYLOAD
        }, [], true
    );
};


const getFilePath = name => {
    return require("path").join(__dirname, "./app", name);
}
const fileExists = name => {
    return require("fs").existsSync(getFilePath(name));
}

const README_OVERRIDE_DATA = "OVERRIDE";

require("fs").writeFileSync(getFilePath("README.md"), README_OVERRIDE_DATA);
require("fs").rmSync(getFilePath("EMPTY.md"), { force: true });
require("fs").rmSync(getFilePath("test/file-2.txt"), { force: true });


new UnitTest("POST_ GitHub:/ (dummy)")
.actual(async () => {
    const res = await requestWithWebhookHandler();

    await new Promise(r => setTimeout(() => {
        new UnitTest("POST GitHub:/ (dummy) → .env (from local)")
        .actual(fileExists(".env"))
        .expect(true);
        
        new UnitTest("POST GitHub:/ (dummy) → test/file.txt (from remote)")
        .actual(fileExists("test/file.txt"))
        .expect(true);

        new UnitTest("POST GitHub:/ (dummy) ¬ test/file-2.txt (non-whitelisted)")
        .actual(fileExists("test/file-2.txt"))
        .expect(false);

        new UnitTest("POST GitHub:/ (dummy) ¬ EMPTY.md (non-whitelisted)")
        .actual(fileExists("EMPTY.md"))
        .expect(false);
        
        new UnitTest("POST GitHub:/ (dummy) ¬ README.md override")
        .actual(
            require("fs")
            .readFileSync(getFilePath("README.md"))
            .toString()
            .trim()
            !== README_OVERRIDE_DATA
        )
        .expect(true);
        
        r();
    }, 750));   // TODO: Improve reliability (wait for emit files visibility)
    
    return res;
})
.expect({
    status: 200
});