import Exception from "../exceptions/Exception";
import MissingParameterException from "../exceptions/MissingParameterException";
import { Booking } from "../models/booking.model";
import { IProviderShopAddress, Provider } from "../models/provider.model";
import { CreateBookingPayload } from "../types/booking.type";

class BookingServiceClass {
    constructor() {
        // super()
    }

    public async createBooking(payload: CreateBookingPayload) {
        const {
            consumerId,
            providerId,
            service,
            serviceName,
            scheduledAt,
            locationType,
            geoAddress,
            note,
            textAddress, // allowed ONLY for home
        } = payload;

        if (!consumerId || !providerId) {
            throw new Exception("Invalid consumer or provider");
        }

        if (!service || !serviceName) {
            throw new MissingParameterException("Service information is required");
        }

        if (!scheduledAt) {
            throw new MissingParameterException("scheduledAt is required");
        }

        if (!locationType) {
            throw new MissingParameterException("locationType is required");
        }

        const provider = await Provider.findById(providerId).select("shopAddress");

        if (!provider) {
            throw new Exception("Provider not found");
        }

        let location: {
            type: "home" | "shop";
            geoAddress?: any;
            textAddress?: string | IProviderShopAddress;
        };

        /* HOME SERVICE */
        if (locationType === "home") {
            if (!geoAddress && !textAddress) {
                throw new MissingParameterException(
                    "Either geoAddress or textAddress is required for home service"
                );
            }

            // if (geoAddress && textAddress) {
            //     throw new MissingParameterException(
            //         "Provide either geoAddress or textAddress, not both"
            //     );
            // }

            location = {
                type: "home",
                ...(geoAddress && { geoAddress }),
                ...(textAddress && { textAddress }),
            };
        }
        /* SHOP SERVICE */
        else {

            if (geoAddress || textAddress) {
                throw new Exception(
                    "Shop service does not accept user-provided address"
                );
            }

            if (!provider.shopAddress) {
                throw new Exception("Provider shop address not set");
            }

            location = {
                type: "shop",
                textAddress: provider.shopAddress,
            };
        }

        const booking = await Booking.create({
            consumerId,
            providerId,
            service,
            serviceName,
            scheduledAt,
            location,
            note,
            status: "pending",
        });

        return {
            bookingId: booking._id,
            status: booking.status,
        };
    }



}

export const BookingService = new BookingServiceClass();


