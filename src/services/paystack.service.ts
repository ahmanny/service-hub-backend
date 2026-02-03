import Exception from "../exceptions/Exception";

class PaystackServiceClass {
    private readonly baseUrl = 'https://api.paystack.co';
    private readonly secretKey = process.env.PAYSTACK_SECRET_KEY;

    /**
     * Common helper for Paystack requests to keep code DRY
     */
    private async paystackRequest(endpoint: string) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${this.secretKey}`,
                'Content-Type': 'application/json',
            },
        });

        const result = await response.json();

        // Handle HTTP errors (401, 400, 429 etc) + Paystack's status boolean
        if (!response.ok || !result.status) {
            throw new Exception(result.message || "Paystack verification failed");
        }

        return result.data;
    }

    public async resolveBank(accountNumber: string, bankCode: string) {
        const data = await this.paystackRequest(
            `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`
        );

        return {
            accountName: data.account_name,
            accountNumber: data.account_number,
        };
    }

    public async getBanks() {
        return await this.paystackRequest('/bank?currency=NGN');
    }
}

export const PaystackService = new PaystackServiceClass();