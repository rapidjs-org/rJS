const { PortMemory } = require("../../debug/common/PortMemory");


new UnitTest("Write + Read")
.actual(() => {
    PortMemory.set(80, "foo", "bar");
    return PortMemory.get(80, "foo");
}).expected("bar");

new UnitTest("Delete + Read")
.actual(() => {
    PortMemory.delete(80, "foo");
    return PortMemory.get(80, "foo");
}).expected(undefined);