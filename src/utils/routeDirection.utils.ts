import axios from "axios";

export async function getDirections(from: [number, number], to: [number, number] | any[]) {
    // Mapbox API expects: longitude,latitude
    const fromStr = `${from[0]},${from[1]}`;
    const toStr = `${to[0]},${to[1]}`;

    const url = `https://api.mapbox.com/directions/v5/mapbox/cycling/${fromStr};${toStr}?alternatives=false&annotations=distance,duration&geometries=geojson&language=en&overview=full&access_token=pk.eyJ1IjoiYWhtYW5ueSIsImEiOiJjbWplcjZlaDcwZ2VrM2RzbWdleGlhNmNzIn0.82jeiD0j7aR-Y5nj1T0ByA`;

    const { data } = await axios.get(url, { timeout: 15000 });
    return data;
}