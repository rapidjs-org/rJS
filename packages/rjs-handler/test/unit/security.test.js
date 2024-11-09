const { request } = require("./_api");

new UnitTest("Security: ≤ Max URI")
.actual(async () => {
    return (await request({
        method: "GET",
        url: "/" + "a".repeat(99)
    })).status;
})
.expect(404);

new UnitTest("Security: > Max URI")
.actual(async () => {
    return (await request({
        method: "GET",
        url: "/" + "a".repeat(100)
    })).status;
})
.expect(414);

new UnitTest("Security: > Max Headers")
.actual(async () => {
    return (await request({
        method: "PUT",
        url: "/",
        headers: {
            "a": "b".repeat(500)
        }
    })).status;
})
.expect(431);

new UnitTest("Security: ≤ Max Payload")
.actual(async () => {
    return (await request({
        method: "PUT",
        url: "/",
        body: JSON.stringify({ d: "a".repeat(999 - 7) })
    })).status;
})
.expect(404);

new UnitTest("Security: > Max Payload")
.actual(async () => {
    return (await request({
        method: "PUT",
        url: "/",
        body: JSON.stringify({ d: "a".repeat(999 - 7 + 1) })
    })).status;
})
.expect(413);

// TODO: Timeout (408)