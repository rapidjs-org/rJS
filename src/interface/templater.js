
const utils = require("../utils");


let templater;


module.exports = {

	bind: callback => {
		if(!utils.isFunction(callback)) {
			throw new TypeError(`Given handler callback argument of type ${typeof(callback)}, expecting Function`);
		}

		templater = callback;
	},

	apply: (data, object, reducedRequestObject) => {
		data = templater(data, object, reducedRequestObject);

		if(!utils.isString(data) && !Buffer.isBuffer(data)) {
			throw new TypeError(`Templating handler must return serialized data of type String or Buffer, given ${typeof(data)}`);
		}

		return data;
	}

};