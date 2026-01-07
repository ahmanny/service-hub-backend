import { ConsumerType } from "../../types/consumer";
import { userType } from "../../types/user.type";
import { AppRole } from "../../utils";






declare global {
  namespace Express {
    interface Request {
      currentUser?: userType;
      consumerProfile?: ConsumerType | null;
      providerProfile?:any
      cloudinaryUrls?: string[];
      appType?: AppRole;
    }
  }
}
export { }
