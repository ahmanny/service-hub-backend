import { UnprocessableEntityExceptionCode } from './codes';
import Exception from './Exception';

class UnprocessableEntityException extends Exception {
    public constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.code = UnprocessableEntityExceptionCode;
        this.name = UnprocessableEntityException.name;
    }
}
export default UnprocessableEntityException;


