new SharedMemoryTest("Write key A")
.actual("write", "foo", "baz quux").expected("baz quux")
.actual("write", "foo", "bar").expected("bar");

new SharedMemoryTest("Write key B")
.actual("write", "bar", "baz").expected("baz");

/* new SharedMemoryTest("Free key A")
.actual("free", "foo").expected(null);

new SharedMemoryTest("Free key B")
.actual("free", "bar").expected(null); */