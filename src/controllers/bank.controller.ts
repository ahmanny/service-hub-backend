import { Request, RequestHandler, Response } from "express";
import UnauthorizedAccessException from "../exceptions/UnauthorizedAccessException";
import { error_handler, ok_handler } from "../utils/response_handler";
import MissingParameterException from "../exceptions/MissingParameterException";
import { PaystackService } from "../services/paystack.service";

export const resolveBankAccount = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const { accountNumber, bankCode } = req.query;

            if (!accountNumber || !bankCode) {
                throw new MissingParameterException("Account number and bank code are required");
            }

            const data = await PaystackService.resolveBank(
                accountNumber as string,
                bankCode as string
            );

            ok_handler(res, "", data);
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}

export const getSupportedBanks = (): RequestHandler => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const banks = await PaystackService.getBanks();
            ok_handler(res, "", banks);
        } catch (error) {
            error_handler(error, req, res)
        }
    }
}

