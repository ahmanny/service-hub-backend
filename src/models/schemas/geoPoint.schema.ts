import { Schema } from "mongoose";

export type GeoAddress = {
    type: "Point";
    coordinates: [number, number]; // lng, lat
};

export const GeoPointSchema = new Schema(
    {
        type: {
            type: String,
            enum: ["Point"],
        },
        coordinates: {
            type: [Number], // [lng, lat]
            required: true,
            validate: {
                validator: (v: number[]) => v.length === 2,
                message: "Geo point must be [longitude, latitude]",
            },
        },
    },
    { _id: false }
);
