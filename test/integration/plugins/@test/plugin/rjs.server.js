console.log("W");

module.exports.test1 = function(ab, REQ, dd = "awd w \" awdaw") {
    console.log(REQ);
    REQ.cookies.set("d", 123);
    console.log(REQ.cookies.get("d"));
    return String(ab) + (dd ?? "");
}

module.exports.test2 = function() {
    return "B";
}