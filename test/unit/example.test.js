const { AsyncMutex } = require("../../debug/common/AsyncMutex");


const ASYNC_MUTEX = new AsyncMutex();
let variable = null;

new UnitTest("Async mutex lock")
.label("Eval 1st (scheduled 1st)").actual(ASYNC_MUTEX.lock(() => {
    variable = "foo";
    return variable;
})).expected("foo")
.label("Eval 2nd (scheduled 3rd)").actual(ASYNC_MUTEX.lock(() => {
    return new Promise(resolve => {
        variable = "bar";
        setTimeout(() => {
            resolve(variable);
        }, 200);
    });
})).expected("bar")
.label("Eval 3rd (scheduled 2nd)").actual(ASYNC_MUTEX.lock(() => {
    return new Promise(resolve => {
        variable = "baz";
        setTimeout(() => {
            resolve(variable);
        }, 100);
    });
})).expected("baz");