assertEquals("Test Atomic Sync – Equal", "abc", "abc");
assertEquals("Test Atomic Sync – Unequal", 123, 1234);

assertEquals("Test Func Async – Equal", new Promise(r => {
    setTimeout(() => r("abc"), 1000);
}), "abc");
assertEquals("Test Func Async – Unequal", new Promise(r => {
    setTimeout(() => r(123), 1000);
}), 1234);

frame("Frame 1", () => {

    assertEquals("Test Atomic Sync – Equal", {
        "abc": 123,
        "def": true
    }, {
        "abc": 123,
        "def": true
    });

    assertEquals("Test Func Sync – Unequal", () => ({
        "abc": 123,
        "def": true
    }), {
        "abc": 1234,
        "def": true
    });

    assertEquals("Test Func Async – Equal", new Promise(r => {
        setTimeout(() => r("abc"), 1000);
    }), "abc");

});

assertEquals("Test Func Sync – Equal", () => "abc", "abc");
assertEquals("Test Func Sync – Unequal", () => 123, 1234);

frame("Frame 2", () => {

    assertEquals("Test Atomic Sync – Equal", "abc", "abc");

});