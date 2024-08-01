// independent script

// max 1; sliding window (weighted)

new HTTPTest("Security: ≤ Rate Limit")
.eval("/")
.expect({
    status: 404
});

new HTTPTest("Security: > Rate Limit")
.eval("/")
.expect({
    status: 429
});