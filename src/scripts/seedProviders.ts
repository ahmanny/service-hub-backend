import mongoose from "mongoose";
import { Provider } from "../models/provider.model";
import { connectDB } from "../configs/db";

const BASE_LAT = 9.8494;
const BASE_LNG = 8.88885;

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

    return {
      userId: new mongoose.Types.ObjectId(),

      firstName: firstNames[index],
      lastName: "Test",
      isVerified:Math.random() > 0.5 ? true : false,
      isAvailable:Math.random() > 0.5 ? true : false,
      homeServiceAvailable:Math.random() > 0.5 ? true : false,

      serviceType,
      availabilityMode: Math.random() > 0.5 ? "instant" : "scheduled",

      basePriceFrom: 2000 + Math.floor(Math.random() * 7000),
      rating: Number((4.2 + Math.random() * 0.7).toFixed(1)),

      services: [
        {
          name: `${serviceType} Basic Service`,
          price: 3000 + Math.floor(Math.random() * 5000),
        },
      ],

      location: {
        type: "Point",
        coordinates: [
          BASE_LNG + randomOffset(), // lng
          BASE_LAT + randomOffset(), // lat
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
