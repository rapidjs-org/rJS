new UnitTest("Example Sync")
.actual(1 + 2).expected(3)
.actual({
    foo: "bar"
}).expected({
    foo: "baz"
})
.actual(() => "Hello world!").expected("Hello world!");

new UnitTest("Example Async")
.actual(new Promise(resolve => {
    setTimeout(() => resolve("Hello mars!"), 1500);
})).expected("Hello mars!")
.actual(new Promise(resolve => {
    setTimeout(() => resolve("Hello mars!"), 1500);
})).expected("Hello saturn!");