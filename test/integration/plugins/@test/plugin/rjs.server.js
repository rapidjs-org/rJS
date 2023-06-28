console.log("W");

module.exports.test1 = function(ab, REQ, dd = "awd w \" awdaw") {
    console.log(REQ);
    return String(ab) + (dd ?? "");
}

module.exports.test2 = function() {
    return "B";
}