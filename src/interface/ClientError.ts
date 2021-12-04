/**
 * Class representing an individual client error.
 * Instance to be thrown for a respective response.
 */

export class ClientError {
    public status: number;
    
    /**
	 * @param {number} status Status code (within client error code range (4**))
	 */
    constructor(status: number) {
    	if(!Number.isInteger(status)
           || status < 400
           || status > 499) {
    		throw new RangeError(`Invalid client error status code ${status} given`);
    	}

    	this.status = status;
    }
}