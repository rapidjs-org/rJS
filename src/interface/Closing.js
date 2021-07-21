/**
 * Class to be instanciated for connection closing.
 * @class
 */
 class Closing {
	constructor(status, message) {
		this.status = status;
		this.message = message;
	}
}

module.exports = Closing;