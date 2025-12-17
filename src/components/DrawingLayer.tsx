import type { FC } from 'react';
import { useMapEvents, Polyline, Marker } from 'react-leaflet';
import L from 'leaflet';

interface DrawingLayerProps {
    isDrawing: boolean;
    points: L.LatLng[];
    onAddPoint: (point: L.LatLng) => void;
}

const DrawingLayer: FC<DrawingLayerProps> = ({ isDrawing, points, onAddPoint }) => {
    useMapEvents({
        click(e) {
            if (isDrawing) {
                onAddPoint(e.latlng);
            }
        },
    });

    return (
        <>
            {/* Draw lines while drawing */}
            {points.length > 0 && isDrawing && (
                <Polyline positions={points} color="blue" dashArray="5, 10" />
            )}

            {/* Show markers for points while drawing */}
            {isDrawing && points.map((p, i) => (
                <Marker key={i} position={p} icon={L.divIcon({ className: 'bg-blue-500 rounded-full w-3 h-3 border border-white', iconSize: [12, 12] })} />
            ))}

            {/* Once finished (we'll determine finish later, for now just show completed polygon logic if needed) */}
        </>
    );
};

export default DrawingLayer;
