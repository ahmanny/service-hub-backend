export interface SearchPayload {
    serviceType: string,
    lng: number,
    lat: number,
    maxDist: number
}

export type LocationTuple = [number, number];

export interface ProviderSearchResult {
    _id: string;
    firstName: string;
    service: string;
    price: number;
    rating: number;
    profilePicture?: string | null;
    distance: number | null;               // in meters
    duration: number | null;               // in seconds
    directionCoordinates: any | null;      // geometry coordinates from directions API
    isCloser: boolean;
}