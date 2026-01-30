import { BadRequestExceptionCode } from './codes';
import Exception from './Exception';

class BadRequestException extends Exception {
    public constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.code = BadRequestExceptionCode;
        this.name = BadRequestException.name;
    }
}
export default BadRequestException;


