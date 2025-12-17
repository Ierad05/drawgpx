import * as turf from '@turf/turf';
import L from 'leaflet';

export const scaleShape = (points: L.LatLng[], targetDistanceKm: number): L.LatLng[] => {
    if (points.length < 3) return points;

    // Convert Leaflet points to Turf LineString (closed loop)
    // Note: Turf uses [lon, lat] order, Leaflet uses [lat, lng]
    const coordinates = points.map(p => [p.lng, p.lat]);
    coordinates.push(coordinates[0]); // Close the loop

    const lineString = turf.lineString(coordinates);
    const currentDistanceKm = turf.length(lineString, { units: 'kilometers' });

    if (currentDistanceKm === 0) return points;

    const scaleFactor = targetDistanceKm / currentDistanceKm;

    // Scale the shape relative to its centroid
    const polygon = turf.polygon([coordinates]);
    const scaledPoly = turf.transformScale(polygon, scaleFactor);

    // Get the coordinates back
    // Type assertion or check needed because transformScale returns a Feature
    if (!scaledPoly.geometry) return points;

    const scaledCoords = scaledPoly.geometry.coordinates[0];

    // Convert back to Leaflet LatLng (remove the last closing point if we want open array, but usually we handle it)
    // We'll return the loop points, minus the last duplicate if we just store vertices
    const newPoints = scaledCoords.slice(0, -1).map(c => L.latLng(c[1], c[0]));

    return newPoints;
};

export const resampleShape = (points: L.LatLng[], numPoints: number = 80): L.LatLng[] => {
    if (points.length < 2) return points;

    // Create a closed LineString
    const coords = points.map(p => [p.lng, p.lat]);
    if (!points[0].equals(points[points.length - 1])) {
        coords.push(coords[0]);
    }
    const lineString = turf.lineString(coords);
    const totalLength = turf.length(lineString, { units: 'kilometers' });
    const step = totalLength / numPoints;

    const resampledCoords: number[][] = [];

    for (let i = 0; i <= numPoints; i++) {
        const dist = i * step;
        const point = turf.along(lineString, dist, { units: 'kilometers' });
        resampledCoords.push(point.geometry.coordinates);
    }

    return resampledCoords.map(c => L.latLng(c[1], c[0]));
};

export const calculateDistance = (points: L.LatLng[]): number => {
    if (points.length < 2) return 0;
    const coordinates = points.map(p => [p.lng, p.lat]);
    coordinates.push(coordinates[0]);
    const lineString = turf.lineString(coordinates);
    return turf.length(lineString, { units: 'kilometers' });
};
