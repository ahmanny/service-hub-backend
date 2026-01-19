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

// Coordinates for Gwagwalada/Jos area context
const BASE_LAT = 9.8494;
const BASE_LNG = 8.88885;

const SERVICE_MAP: Record<string, { name: string; value: string }[]> = {
  barber: BARBER_SERVICES,
  hair_stylist: HAIR_STYLIST_SERVICES,
  electrician: ELECTRICIAN_SERVICES,
  plumber: PLUMBER_SERVICES,
  house_cleaning: HOUSE_CLEANING_SERVICES,
};

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
  "Abdul", "Ngozi", "Sadiq", "Tunde", "Ibrahim", "Solomon", "Chidi", "Bisi",
  "Umar", "Kelechi", "Yusuf", "Joy", "Victor", "Sarah", "Musa", "Daniel",
  "Rita", "Omer", "Bunmi", "Sani", "Amaka", "Felix", "Gloria", "Emma", "Hope",
  "Suleiman", "Deborah", "Kazeem", "Anita", "Paul", "Mary", "Lekan", "Efe", "Dapo", "Rose"
];

/**
 * Logic:
 * 1. Barbers: Closed Friday. Open Sunday (4pm-10pm). Others (8am-10pm).
 * 2. Others: Closed Sunday. Open Friday (8am-10pm). Others (8am-10pm).
 */
const generateSpecificAvailability = (serviceType: string) => {
  return Array.from({ length: 7 }).map((_, i) => {
    const isBarber = serviceType === "barber";
    const dayOfWeek = i; // 0=Sun, 1=Mon... 5=Fri, 6=Sat

    // --- SUNDAY LOGIC (0) ---
    if (dayOfWeek === 0) {
      if (isBarber) {
        return {
          dayOfWeek,
          isClosed: false,
          slots: [{ start: "16:00", end: "22:00" }]
        };
      }
      return { dayOfWeek, isClosed: true, slots: [] };
    }

    // --- FRIDAY LOGIC (5) ---
    if (dayOfWeek === 5) {
      if (isBarber) {
        return { dayOfWeek, isClosed: true, slots: [] };
      }
      return {
        dayOfWeek,
        isClosed: false,
        slots: [{ start: "08:00", end: "22:00" }]
      };
    }

    // --- NORMAL DAYS (Mon, Tue, Wed, Thu, Sat) ---
    return {
      dayOfWeek,
      isClosed: false,
      slots: [{ start: "08:00", end: "22:00" }]
    };
  });
};

const seedProviders = async () => {
  try {
    await connectDB();
    console.log("Starting advanced seeding for 50 providers...");

    // Clear old data 
    await Provider.deleteMany({});

    const providers = Array.from({ length: 50 }).map((_, index) => {
      const serviceType = serviceTypes[index % serviceTypes.length];
      const catalog = SERVICE_MAP[serviceType];

      // Randomly pick 2–4 services
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
        firstName: firstNames[index % firstNames.length],
        lastName: index % 2 === 0 ? "Expert" : "Services",
        profilePicture: `https://i.pravatar.cc/150?u=${index}`,

        status: Math.random() > 0.3 ? "pending" : "approved",
        isAvailable: true,
        homeServiceAvailable: Math.random() > 0.4,

        serviceType: serviceType as any,
        availabilityMode: Math.random() > 0.5 ? "instant" : "scheduled",
        basePriceFrom: 1500 + Math.floor(Math.random() * 3500),
        rating: Number((3.5 + Math.random() * 1.5).toFixed(1)),

        services: selectedServices,

        shopAddress: {
          address: `${index + 100} Professional Plaza, Gwagwalada`,
          city: "Gwagwalada",
          state: "FCT",
          location: {
            type: "Point",
            coordinates: [
              BASE_LNG + (Math.random() - 0.5) * 0.06, // Spread for 50 providers
              BASE_LAT + (Math.random() - 0.5) * 0.06,
            ],
          },
        },

        availability: generateSpecificAvailability(serviceType),
      };

      return providerData;
    });

    await Provider.insertMany(providers);
    console.log(`✅ Successfully seeded ${providers.length} providers.`);
    console.log("📅 Logic applied: Barbers closed Fri/Sunday PM. Others closed Sunday/Open Fri.");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

seedProviders();