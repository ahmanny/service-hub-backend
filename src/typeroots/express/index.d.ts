import { ConsumerType } from "../../types/consumer";
import { userType } from "../../types/user.type";






declare global {
  namespace Express {
    interface Request {
      currentUser?: userType;
      consumerProfile?: ConsumerType | null;
      cloudinaryUrls?: string[];
    }
  }
}
export { }
