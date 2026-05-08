import { ConsumerProfileType } from "../../types/consumer";
import { ProviderProfileType } from "../../types/providers.types";
import { userType } from "../../types/user.type";
import { AppRole } from "../../utils";
import { AdminUserType } from "../../types/admin.type";






declare global {
  namespace Express {
    interface Request {
      currentUser?: userType | AdminUserType;
      consumerProfile?: ConsumerProfileType | null;
      providerProfile?: ProviderProfileType | null
      cloudinaryUrls?: string[];
      appType?: AppRole;
    }
  }
}
export { }
