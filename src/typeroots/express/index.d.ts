import { ConsumerType } from "../../types/consumer";
import { userType } from "../../types/user.type";






declare global {
  namespace Express {
    interface Request {
      // consumerProfile?: ConsumerType;
      currentUser?: userType;
      cloudinaryUrls?: string[];
    }
  }
}
export { }
