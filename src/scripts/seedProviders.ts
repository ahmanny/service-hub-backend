import mongoose from "mongoose";
import { Provider, IProviderProfile } from "../models/provider.model";
import { connectDB } from "../configs/db";
import {
  BARBER_SERVICES,
  ELECTRICIAN_SERVICES,
  HAIR_STYLIST_SERVICES,
  HOUSE_CLEANING_SERVICES,
  PLUMBER_SERVICES
} from "../constants/services";

const BASE_LAT = 9.8494;
const BASE_LNG = 8.88885;

const SERVICE_MAP: Record<string, { name: string; value: string }[]> = {
  barber: BARBER_SERVICES,
  hair_stylist: HAIR_STYLIST_SERVICES,
  electrician: ELECTRICIAN_SERVICES,
  plumber: PLUMBER_SERVICES,
  house_cleaning: HOUSE_CLEANING_SERVICES,
};

const randomOffset = () => (Math.random() - 0.5) * 0.01; // Slightly larger spread

const serviceTypes = [
  "plumber",
  "electrician",
  "house_cleaning",
  "hair_stylist",
  "barber",
];

const firstNames = [
  "John", "Samuel", "Aisha", "Grace", "Peter", "Ruth", "David", "Zainab",
  "Emeka", "Fatima", "Tosin", "Blessing", "Kelvin", "Hadiza", "Michael",
  "Abdul", "Ngozi", "Sadiq", "Tunde", "Ibrahim",
];

// Helper to generate a standard work week
const generateAvailability = () => {
  return Array.from({ length: 7 }).map((_, i) => ({
    dayOfWeek: i,
    isClosed: i === 0, // Sunday closed
    slots: i === 0 ? [] : [{ start: "08:00", end: "18:00" }]
  }));
};

const seedProviders = async () => {
  try {
    await connectDB();
    console.log("Seeding providers...");

    // Clear old data 
    await Provider.deleteMany({});

    const providers = Array.from({ length: 20 }).map((_, index) => {
      const serviceType = serviceTypes[index % serviceTypes.length];
      const catalog = SERVICE_MAP[serviceType];

      // Pick 2–4 services per provider
      const selectedServices = catalog
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.floor(Math.random() * 3) + 2)
        .map(service => ({
          name: service.name,
          value: service.value,
          price: 3000 + Math.floor(Math.random() * 7000),
        }));

      const providerData: Partial<IProviderProfile> = {
        userId: new mongoose.Types.ObjectId(),
        firstName: firstNames[index],
        lastName: "Test",
        profilePicture: `https://i.pravatar.cc/150?img=${index + 1}`,

        isVerified: Math.random() > 0.4,
        isAvailable: true,
        homeServiceAvailable: Math.random() > 0.3,

        serviceType: serviceType as any,
        availabilityMode: Math.random() > 0.5 ? "instant" : "scheduled",
        basePriceFrom: 2000 + Math.floor(Math.random() * 5000),
        rating: Number((4.0 + Math.random() * 1.0).toFixed(1)),

        services: selectedServices,

        // Matches the new IProviderShopAddress interface
        shopAddress: {
          address: `${index + 10} Professional Way, Tech Hub`,
          city: "Jos",
          state: "Plateau",
          location: {
            type: "Point",
            coordinates: [
              BASE_LNG + randomOffset(),
              BASE_LAT + randomOffset(),
            ],
          },
        },

        // Matches the IAvailabilityDay interface
        availability: generateAvailability(),
      };

      return providerData;
    });

    await Provider.insertMany(providers);
    console.log(`✅ Successfully seeded ${providers.length} providers.`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

seedProviders();