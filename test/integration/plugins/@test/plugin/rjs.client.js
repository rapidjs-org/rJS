module.exports.test = async function() {
    return await (await test1()).text();
};