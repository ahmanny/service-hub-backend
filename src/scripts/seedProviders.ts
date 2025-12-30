import mongoose from "mongoose";
import { Provider } from "../models/provider.model";
import { connectDB } from "../configs/db";
import { BARBER_SERVICES, ELECTRICIAN_SERVICES, HAIR_STYLIST_SERVICES, HOUSE_CLEANING_SERVICES, PLUMBER_SERVICES } from "../constants/services";

const BASE_LAT = 9.8494;
const BASE_LNG = 8.88885;


const SERVICE_MAP: Record<string, { name: string; value: string }[]> = {
  barber: BARBER_SERVICES,
  hair_stylist: HAIR_STYLIST_SERVICES,
  electrician: ELECTRICIAN_SERVICES,
  plumber: PLUMBER_SERVICES,
  house_cleaning: HOUSE_CLEANING_SERVICES,
};



// small random offset (keeps providers close)
const randomOffset = () => (Math.random() - 0.5) * 0.004;

const serviceTypes = [
  "plumber",
  "electrician",
  "house_cleaning",
  "hair_stylist",
  "barber",
];

const firstNames = [
  "John",
  "Samuel",
  "Aisha",
  "Grace",
  "Peter",
  "Ruth",
  "David",
  "Zainab",
  "Emeka",
  "Fatima",
  "Tosin",
  "Blessing",
  "Kelvin",
  "Hadiza",
  "Michael",
  "Abdul",
  "Ngozi",
  "Sadiq",
  "Tunde",
  "Ibrahim",
];

const seedProviders = async () => {
  await connectDB();

  console.log("Seeding providers...");

  //clear old data 
  await Provider.deleteMany({});

  const providers = Array.from({ length: 20 }).map((_, index) => {
    const serviceType = serviceTypes[index % serviceTypes.length];

    const catalog = SERVICE_MAP[serviceType];

    // pick 2–4 services per provider
    const selectedServices = catalog
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.floor(Math.random() * 3) + 2)
      .map(service => ({
        name: service.name,
        value: service.value,
        price: 3000 + Math.floor(Math.random() * 7000),
      }));

    return {
      userId: new mongoose.Types.ObjectId(),

      firstName: firstNames[index],
      lastName: "Test",

      isVerified: Math.random() > 0.5,
      isAvailable: Math.random() > 0.5,
      homeServiceAvailable: Math.random() > 0.5,

      serviceType,
      availabilityMode: Math.random() > 0.5 ? "instant" : "scheduled",

      basePriceFrom: 2000 + Math.floor(Math.random() * 7000),
      rating: Number((4.2 + Math.random() * 0.7).toFixed(1)),

      services: selectedServices,

      location: {
        type: "Point",
        coordinates: [
          BASE_LNG + randomOffset(),
          BASE_LAT + randomOffset(),
        ],
      },

      profilePicture: `https://i.pravatar.cc/150?img=${index + 1}`,
    };

  });

  await Provider.insertMany(providers);

  console.log("Providers seeded successfully");
  process.exit(0);
};

seedProviders();
