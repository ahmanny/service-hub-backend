import { ConsumerType } from "../../types/consumer";






declare global {
    namespace Express {
        interface Request {
            user?: ConsumerType;
        }
    }
}
export { }
