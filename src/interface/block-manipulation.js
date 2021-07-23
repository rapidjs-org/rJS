const regex = {
	blockOpen: "<\\s*r--block\\s+(rel=(\"|')\\s*(@[a-z0-9_-]+\\/)?[a-z0-9_-]+\\s*\\2\\s*)>",
	blockClose: "<\\s*\\/r--block\\s*>"
};

function parse(data) {
	const scanRegex = new RegExp(`(${regex.blockOpen})|(${regex.blockClose})`);
	let curIndex = 0;
	console.log(":::")
	console.log(data.slice(curIndex).search(scanRegex));

	return data;
}

module.exports = {
	parse
};