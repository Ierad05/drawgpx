import axios from 'axios';
import L from 'leaflet';

const OSRM_ROOT = 'https://router.project-osrm.org';

// OSRM Public API limits: ~25 coordinates per request is safe.
const CHUNK_SIZE = 20;

export type RouteProfile = 'foot' | 'bike';

export const getSmartRoute = async (points: L.LatLng[], profile: RouteProfile = 'foot'): Promise<L.LatLng[]> => {
    if (points.length < 2) return [];

    // Break points into overlapping chunks
    const chunks: L.LatLng[][] = [];
    for (let i = 0; i < points.length - 1; i += (CHUNK_SIZE - 1)) {
        // We need overlap to ensure continuity: Chunk 1 ends at index X, Chunk 2 starts at index X
        const chunk = points.slice(i, i + CHUNK_SIZE);
        if (chunk.length < 2) break; // Should not happen with valid logic usually
        chunks.push(chunk);
    }

    let fullRoute: L.LatLng[] = [];

    try {
        // Execute requests sequentially (or parallel, but OSRM might rate limit parallel, sequential is safer for order)
        for (const chunk of chunks) {
            const chunkRoute = await fetchRouteSegment(chunk, profile);
            if (chunkRoute.length === 0) {
                // If a segment fails, we might have a gap. 
                // Fallback: just straight line connect (or ignore? straight line is better UI)
                console.warn("Segment failed, drawing straight line for this segment.");
                fullRoute = fullRoute.concat(chunk);
                continue;
            }

            // If it's not the first chunk, remove the first point of the new segment 
            // because it is the same as the last point of the previous segment (overlap)
            if (fullRoute.length > 0) {
                // Ideally, check distance or identity. 
                // OSRM route start point fits the requested start point.
                fullRoute = fullRoute.concat(chunkRoute.slice(1));
            } else {
                fullRoute = fullRoute.concat(chunkRoute);
            }
        }

        return fullRoute;

    } catch (error) {
        console.error("Failed to fetch route chunks", error);
        return [];
    }
};

const fetchRouteSegment = async (points: L.LatLng[], profile: RouteProfile): Promise<L.LatLng[]> => {
    // Format: lon,lat;lon,lat
    const coordinatesString = points
        .map(p => `${p.lng},${p.lat}`)
        .join(';');

    const url = `${OSRM_ROOT}/route/v1/${profile}/${coordinatesString}?overview=full&geometries=geojson`;

    try {
        const response = await axios.get(url);
        if (response.data.code !== 'Ok' || !response.data.routes || response.data.routes.length === 0) {
            return [];
        }
        const geometry = response.data.routes[0].geometry;
        return geometry.coordinates.map((c: number[]) => L.latLng(c[1], c[0]));
    } catch (err) {
        console.error("OSRM Chunk Error", err);
        return [];
    }
};
