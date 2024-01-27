const KEY = "foo";

new SharedMemoryTest("Write")
.actual("write", KEY, "baz quux").expected("baz quux")
.actual("write", KEY, "bar").expected("bar");

new SharedMemoryTest("Free")
.actual("free", KEY).expected(null);