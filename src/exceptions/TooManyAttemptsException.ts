import { TooManyAttemptsExceptionCode } from './codes';
import Exception from './Exception';

class TooManyAttemptsException extends Exception {
    public constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.code = TooManyAttemptsExceptionCode;
        this.name = TooManyAttemptsException.name;
    }
}
export default TooManyAttemptsException;


