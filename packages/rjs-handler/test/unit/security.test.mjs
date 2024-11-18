import { request } from "./_api.mjs";


new UnitTest("Valid explicit hostname")
.actual(async () => {
    return (await request({
        method: "GET",
        url: "/",
        headers: {
            "Host": "example.org"
        }
    })).status;
})
.expect(200);

new UnitTest("Valid explicit hostname")
.actual(async () => {
    return (await request({
        method: "GET",
        url: "/",
        headers: {
            "Host": "www.example.org"
        }
    })).status;
})
.expect(301);

new UnitTest("Valid explicit hostname")
.actual(async () => {
    return (await request({
        method: "GET",
        url: "/",
        headers: {
            "Host": "other.example.org:80"
        }
    })).status;
})
.expect(200);

new UnitTest("Invalid explicit hostname")
.actual(async () => {
    return (await request({
        method: "GET",
        url: "/",
        headers: {
            "Host": "invalid.example.org"
        }
    })).status;
})
.expect(404);

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