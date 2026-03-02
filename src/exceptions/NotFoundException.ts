import { NotFoundExceptionCode } from './codes';
import Exception from './Exception';

class NotFoundException extends Exception {
    public constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.code = NotFoundExceptionCode;
        this.name = NotFoundException.name;
    }
}
export default NotFoundException;


