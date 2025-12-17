import type { FC } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import DrawingLayer from './DrawingLayer';

// Fix for default marker icons in Leaflet with webpack/vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapComponentProps {
    isDrawing: boolean;
    points: L.LatLng[];
    routePath?: L.LatLng[];
    onAddPoint: (point: L.LatLng) => void;
}

const MapComponent: FC<MapComponentProps> = ({ isDrawing, points, routePath, onAddPoint }) => {
    return (
        <MapContainer
            center={[48.8566, 2.3522]} // Default center (Paris)
            zoom={13}
            scrollWheelZoom={true}
            className="h-full w-full outline-none"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <DrawingLayer isDrawing={isDrawing} points={points} onAddPoint={onAddPoint} />

            {/* Scale/Target Shape (Blue) */}
            {!isDrawing && points.length > 2 && (
                <Polygon positions={points} pathOptions={{ color: 'blue', opacity: 0.3, fillOpacity: 0.1 }} />
            )}

            {/* Generated Route (Red) */}
            {routePath && routePath.length > 1 && (
                <Polyline positions={routePath} pathOptions={{ color: '#ef4444', weight: 5, opacity: 0.8 }} />
            )}
        </MapContainer>
    );
};

export default MapComponent;
