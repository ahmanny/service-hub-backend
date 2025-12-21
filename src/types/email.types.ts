import { Types } from "mongoose"


export interface SendResetPasswordLinkEmailPayload {
    email: string,
    firstName: string
    lastName: string
    id: Types.ObjectId
}