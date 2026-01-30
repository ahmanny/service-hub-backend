import { InternalServerErrorExceptionCode } from './codes';
import Exception from './Exception';

class InternalServerErrorException extends Exception {
    public constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.code = InternalServerErrorExceptionCode;
        this.name = InternalServerErrorException.name;
    }
}
export default InternalServerErrorException;


