/**
 * Class representing an individual response error for closing a request irregularly.
 * Instance to be thrown for a respective response.
 */


export abstract class ResponseError {
    public status: number;
    public message: string;
    
    /**
	 * @param {number} status Status code (within client error code range (4**))
	 */
    constructor(leadingDigit: number, status: number, message?: string) {
        const offset: number = leadingDigit * 100;

    	if(!Number.isInteger(status)
           || status < offset
           || status > (offset + 99)) {
    		throw new RangeError(`Invalid error status code thrown '${status}' [${offset}, ${offset + 99}]`);
    	}

    	this.status = status;
        this.message = message;
    }
}