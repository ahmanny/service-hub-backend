import { ConsumerType } from "../../types/consumer";






declare global {
    namespace Express {
        interface Request {
            consumer?: ConsumerType;
            cloudinaryUrls?: string[];
        }
    }
}
export { }
