import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { useState } from "react";

function LocationMarker({ setPosition }) {
  const [position, setLocalPosition] = useState(null);

  useMapEvents({
    click(e) {
      setLocalPosition(e.latlng);
      setPosition(e.latlng);
    },
  });

  return position === null ? null : <Marker position={position} />;
}

export default function MapPicker({ onSelect }) {
  const [position, setPosition] = useState(null);

  return (
    <div style={{ height: "300px", borderRadius: "10px", overflow: "hidden" }}>
      <MapContainer
        center={[41.3111, 69.2797]} // Tashkent default
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker setPosition={setPosition} />
      </MapContainer>

      <button
        onClick={() => position && onSelect(position)}
        style={{
          marginTop: "10px",
          width: "100%",
          padding: "10px",
          background: "#22c55e",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        📍 Yuborish
      </button>
    </div>
  );
}