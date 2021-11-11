const utils = require("../utils");


const templaters = [];


module.exports = {

	bind: (callback, implicitReadingOnly = false) => {
		if(!utils.isFunction(callback)) {
			throw new TypeError(`Given handler callback argument of type ${typeof(callback)}, expecting Function`);
		}
		
		templaters.push({
			callback: callback,
			implicitReadingOnly: implicitReadingOnly
		});
	},

	apply: (data, object, reducedRequestObject, isImplicitRequest = false) => {
		templaters
		.filter(templater => {
			if(!isImplicitRequest) {
				return !templater.implicitReadingOnly;
			}

			return true;
		})
		.forEach(templater => {
			data = templater.callback(data, object, reducedRequestObject);
			
			if(!utils.isString(data) && !Buffer.isBuffer(data)) {
				throw new TypeError(`Templating handler must return serialized data of type String or Buffer, given ${typeof(data)}`);
			}
		});

		return data;
	}

};