const config = {
	blockPrefix: "r--",
	dynamicIdentifier: "dynamic",
	includeIdentifier: "include",
	nameAttributeName: "name",
	sourceAttributeName: "src",
	unitSuffix: "-unit",
};


const {join, dirname} = require("path");
const {existsSync} = require("fs");

const utils = require("../utils");
const output = require("./output");
const webPath = require("./web-path");

const reader = require("../interface/reader");

const ClientError = require("../interface/ClientError");

// TODO: Caching, regex storage?, code optimization


const regex = {
	block: (identifier, opening) => {
		if(opening) {
			return new RegExp(`<\\s*${config.blockPrefix}${identifier}(\\s*${regex.attr("[a-z0-9_-]+").source})?\\s*>`, "i");
		}
		
		return new RegExp(`<\\s*\\/${config.blockPrefix}${identifier}\\s*>`, "i");
	},
	attr: name => {
		return new RegExp(`${name}\\s*=\\s*("|')((?!("|'))(\\s|.))*("|')`, "i");
	}
};


class Node {
	constructor(value) {
		this.children = [];
		this.parent = null;

		this.value = value;
		this.childIndexes = [];
	}

	setParent(node) {
		this.parent = node;
	}
	getParent() {
		return this.parent;
	}
	addChild(node) {
		this.children.push(node);
	}

	setValue(value) {
		this.value = value;
	}
	getValue() {
		return this.value;
	}
	addChildIndex(index) {
		this.childIndexes.push(index);
	}
}

class Tree {
	constructor() {
		this.root = new Node();
	}

	append(parentNode, index) {
		const node = new Node(index);

		node.setParent(parentNode);
		parentNode.addChild(node);

		return node;
	}
}


function buildTree(data, identifier) {
	const tree = new Tree();

	let curIndex = 0;
	let curNode = tree.root;
	
	while(curIndex >= 0) {
		const curData = data.slice(curIndex);

		const open = curData.search(regex.block(identifier, true));
		const close = curData.search(regex.block(identifier, false));
		
		if(open - close == 0) {
			curIndex = -1;

			continue;
		}

		const minIndex = Math.min(((open < 0) ? Infinity : open), ((close < 0) ? Infinity : close));
		curIndex += minIndex;

		const isOpening = (minIndex == open);
		
		if(!isOpening && curNode != tree.root) {
			const endIndex = curIndex + curData.match(regex.block(identifier, false))[0].length;
			curIndex = curNode.getValue();

			let block = data.slice(curIndex, endIndex);
			curNode.setValue(prepareBlock(block, identifier, config.sourceAttributeName));

			data = data.slice(0, curIndex) + data.slice(endIndex);
			
			const parentNode = curNode.getParent();
			parentNode.addChildIndex(curIndex - (parentNode.getValue() || 0));
			curNode = parentNode;

			continue;
		}

		if(isOpening){
			const newNode = tree.append(curNode, curIndex);

			curNode = newNode;
		}

		curIndex++;
	}

	tree.root.setValue({
		content: data
	});

	return tree;
}
	
function prepareBlock(block, blockIdentifier, attrName) {
	const openingTag = block.match(regex.block(blockIdentifier, true))[0];
	let source = (openingTag.match(regex.attr(attrName)) || {})[0];
	source = source ? source.slice(source.search(/"|'/) + 1, -1).trim() : undefined;
	const content = block.slice(openingTag.length).replace(regex.block(blockIdentifier, false), "");
	
	return {
		content: content.trim(),
		source: source
	};
}

function scanMarks(content) {
	const marks = (content.match(/\{\{\s*[a-z_][a-z0-9_-]+\s*\}\}/gi) || []).map(mark => {
		return mark.slice(2, -2).trim();
	});

	return new Set(marks);
}

function subMarks(content, marks, strategy) {
	marks.forEach(mark => {
		const regex = new RegExp(`\\{\\{\\s*${mark}\\s*\\}\\}`, "g");
		content = content.replace(regex, String(strategy(mark)));
	});

	return content;
}


function renderIncludes(data, path) {
	const tree = buildTree(data, config.includeIdentifier);
	if(tree.root.children.length == 0) {
		// No further action if no blocks found
		return tree.root.getValue().content;
	}
	
	// Run tree for render
	return renderBlock(tree.root, true);

	function renderBlock(node, firstCall = false) {
		const value = node.getValue();
		let content = value.content;

		for(let i = ((node.children || []).length - 1); i >= 0; i--) {
			const childIndex = node.childIndexes[i];
			content = content.slice(0, childIndex) + renderBlock(node.children[i]) + content.slice(childIndex);
		}

		if(firstCall) {
			return content;
		}

		let filePath = value.source;
		
		let rendered;
		try {
			if(!filePath) {
				throw new ReferenceError(`Missing source on include block at '${path}'`);
			}

			filePath = filePath.replace(new RegExp(`(${utils.supportFilePrefix})?([a-z0-9_-]+)(\\.html)?$`), `${utils.supportFilePrefix}$2.html`);
			rendered = String(reader.useReader(join(dirname(path), filePath)));
			
			// Update src and href attributes according to include host location
			// TODO: Improve for better reliability and more reference cases
			rendered = rendered.replace(/\s(href|src)\s*=\s*("|')\s*[a-zA-Z._][a-zA-Z._/\\-]*\s*\2/g, attr => {
				let reference = attr.match(/[a-zA-Z._/\\-]+\s*("|')$/)[0].slice(0, -1).trim();

				// Get relative paths joined from value and base path
				reference = join(dirname(filePath), reference);
				
				return attr.replace(/("|')\s*[a-zA-Z._/\\-]+\s*(\1)/, `$1/${reference}$2`);
			});

			// Substitute marks by related units
			let unitsMap = new Map();
			
			const units = content.match(new RegExp(`${regex.block(config.includeIdentifier + config.unitSuffix, true).source}((?!${regex.block(config.includeIdentifier + config.unitSuffix, false).source})(\\s|.))*${regex.block(config.includeIdentifier + config.unitSuffix, false).source}`, "gi"));
			(units || []).forEach(unit => {
				unit = prepareBlock(unit, config.includeIdentifier + config.unitSuffix, config.nameAttributeName);
				
				unitsMap.set(unit.source, unit.content);
			});
			
			rendered = subMarks(rendered, scanMarks(rendered), mark => unitsMap.get(mark) || "");
		} catch(err) {
			output.error(err);
		}

		return rendered || "";
	}
}

function renderDynamics(data, path, reducedRequestObject) {
	const tree = buildTree(data, config.dynamicIdentifier);

	if(tree.root.children.length == 0) {
		// No further action if no blocks found
		return tree.root.getValue().content;
	}

	const templatingModulePath = join(webPath, path.replace(/(\/)(.+\.)[a-z0-9]+$/i, `$1${utils.supportFilePrefix}$2js`));
	if(!existsSync(templatingModulePath)) {
		// No further action if no templating module deployed
		return tree.root.getValue().content;
	}

	let templatingModule;
	try {
		templatingModule = require(templatingModulePath);
		
		utils.isFunction(templatingModule) && (templatingModule = templatingModule(reducedRequestObject));
	} catch(err) {
		if(!(err instanceof ClientError)) {
			output.log(`Error executing templating module '${templatingModulePath}':`);
		}

		throw err;
	}

	// Run tree for render
	return renderBlock(tree.root, templatingModule, true);

	function renderBlock(node, object, firstCall = false) {
		const value = node.getValue();
		let content = value.content;

		if(!value.source && !firstCall) {
			output.error(`Missing source on dynamic block at '${path}'`);
		}

		let subObject = !value.source ? object : (object || {})[value.source];
		subObject = utils.isFunction(subObject) ? subObject() : (subObject || []);
		
		for(let i = ((node.children || []).length - 1); i >= 0; i--) {
			const childIndex = node.childIndexes[i];
			content = content.slice(0, childIndex) + renderBlock(node.children[i], subObject) + content.slice(childIndex);
		}

		if(firstCall) {
			return content;
		}

		const marks = scanMarks(content);
		
		let rendered = "";
		(Array.isArray(subObject) ? subObject : [subObject]).forEach(element => {
			rendered += subMarks(content, marks, mark => (element || {})[mark] || "");
		});
		
		return rendered;
	}
}


module.exports = {
	renderIncludes,
	renderDynamics
};