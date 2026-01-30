import { PayloadTooLargeExceptionCode } from './codes';
import Exception from './Exception';

class PayloadTooLargeException extends Exception {
    public constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.code = PayloadTooLargeExceptionCode;
        this.name = PayloadTooLargeException.name;
    }
}
export default PayloadTooLargeException;


