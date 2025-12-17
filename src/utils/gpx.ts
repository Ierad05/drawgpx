import L from 'leaflet';

export const generateGPX = (points: L.LatLng[]): string => {
    const header = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="DrawGPX" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>DrawGPX Custom Route</name>
    <trkseg>`;

    const footer = `
    </trkseg>
  </trk>
</gpx>`;

    const content = points.map(p => {
        return `      <trkpt lat="${p.lat}" lon="${p.lng}"></trkpt>`;
    }).join('\n');

    return header + '\n' + content + footer;
};

export const downloadGPX = (points: L.LatLng[], filename: string = 'route.gpx') => {
    const gpxData = generateGPX(points);
    const blob = new Blob([gpxData], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
