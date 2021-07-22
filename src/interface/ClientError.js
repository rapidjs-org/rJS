/**
 * Class for individual client error responses.
 * @class
 */
class ClientError {
	constructor(status, message) {
		if(!((status % 400) < 99)) {
			throw new RangeError(`Status code ${status} not located within the client error value range`);
		}

		this.status = status;
		this.message = message;
	}
}


module.exports = ClientError;