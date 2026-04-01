import { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";

// 🔥 MAPNI HARAKAT QILDIRISH (FIX)
function FlyToLocation({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.flyTo(position, 15, {
        duration: 1.5,
      });
    }
  }, [position, map]);

  return null;
}

// 📍 CLICK QILIB TANLASH
function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position ? <Marker position={position} /> : null;
}

export default function LocationModal({ onClose, onSend }) {
  const [position, setPosition] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔥 SMART SEARCH (ENG MUHIM QISM)
  const handleSearch = async () => {
    if (!search.trim()) return;

    setLoading(true);

    try {
      // 🔥 QUERYNI KUCHAYTIRAMIZ
      const normalized = search
        .toLowerCase()
        .replace("maktab", "school")
        .replace("universitet", "university")
        .replace("institut", "institute")
        .replace("kollej", "college")
        .replace("litsey", "lyceum")
        .replace("gimnaziya", "gymnasium");

      // 🔥 BIR NECHTA VARYANTLAR
      const variants = [
        `${normalized} Tashkent, Uzbekistan`,
        `${normalized} Uzbekistan`,
        `${normalized}`,
        `${search} Tashkent`,
        `${search}`,
      ];

      let found = false;

      for (const query of variants) {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query,
          )}&limit=10&addressdetails=1&countrycodes=uz&accept-language=uz,en`,
        );

        const data = await res.json();

        console.log("SEARCH RESULT:", query, data);

        if (data.length > 0) {
          // ✅ ENG YAQIN NATIJA
          const best = data[0];

          const newPos = {
            lat: parseFloat(best.lat),
            lng: parseFloat(best.lon),
          };

          setPosition(newPos);
          found = true;
          break;
        }
      }

      // 🔥 AGAR TOPILMASA - BOSHQA STRATEGIYALAR
      if (!found) {
        // 1. Faqat nomni qidirish
        const nameOnlyRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            search,
          )}&limit=5&addressdetails=1&accept-language=uz,en`,
        );

        const nameData = await nameOnlyRes.json();

        if (nameData.length > 0) {
          const best = nameData[0];
          setPosition({
            lat: parseFloat(best.lat),
            lng: parseFloat(best.lon),
          });
          found = true;
        }
      }

      if (!found) {
        // 2. Google Places API (agar mavjud bo'lsa)
        try {
          const googleRes = await fetch(
            `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
              search,
            )}&key=YOUR_GOOGLE_API_KEY`,
          );

          const googleData = await googleRes.json();

          if (googleData.results && googleData.results.length > 0) {
            const best = googleData.results[0];
            setPosition({
              lat: best.geometry.location.lat,
              lng: best.geometry.location.lng,
            });
            found = true;
          }
        } catch (error) {
          // Google API ishlamasa, keyingi qadamga o'tamiz
          console.log("Google API ishlamadi:", error);
        }
      }

      if (!found) {
        // 🔥 FALLBACK (hech bo‘lmasa city topamiz)
        const fallbackRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            search.split(" ")[0] + " Tashkent, Uzbekistan",
          )}&limit=1&accept-language=uz,en`,
        );

        const fallbackData = await fallbackRes.json();

        if (fallbackData.length > 0) {
          const fallback = fallbackData[0];

          setPosition({
            lat: parseFloat(fallback.lat),
            lng: parseFloat(fallback.lon),
          });

          alert("❗ Aniq joy topilmadi, yaqin hudud ko‘rsatildi. Pin qo‘ying.");
        } else {
          alert("❌ Joy topilmadi, mapdan belgilang");
        }
      }
    } catch (err) {
      alert("Search error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3 style={styles.title}>📍 Joylashuvingizni tanlang</h3>

        {/* SEARCH */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Joy nomini yozing..."
            style={styles.input}
          />
          <button onClick={handleSearch} style={styles.searchBtn}>
            {loading ? "..." : "🔍"}
          </button>
        </div>

        {/* MAP */}
        <MapContainer
          center={[41.3111, 69.2797]}
          zoom={13}
          style={{ height: "300px", borderRadius: "10px" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          <LocationMarker position={position} setPosition={setPosition} />

          {/* 🔥 FIXED FLY */}
          <FlyToLocation position={position} />
        </MapContainer>

        {/* BUTTONS */}
        <div style={styles.actions}>
          <button onClick={onClose} style={styles.cancelBtn}>
            ❌ Bekor qilish
          </button>

          <button
            onClick={() => {
              if (!position) {
                alert("❗ Avval joy tanlang");
                return;
              }
              onSend(position);
            }}
            style={styles.sendBtn}
          >
            📤 Yuborish
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  modal: {
    width: "400px",
    background: "#1f2937",
    padding: "15px",
    borderRadius: "12px",
    color: "#fff",
  },
  input: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(0,0,0,0.3)",
    color: "#fff",
    fontSize: "14px",
    outline: "none",
  },
  searchBtn: {
    padding: "10px 14px",
    borderRadius: "8px",
    border: "none",
    background: "rgba(59,130,246,0.2)",
    color: "#7dd3fc",
    cursor: "pointer",
    fontSize: "16px",
  },
  actions: {
    marginTop: "12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
  },
  sendBtn: {
    flex: 1,
    padding: "10px",
    borderRadius: "8px",
    border: "none",
    background: "linear-gradient(135deg, #22c55e, #16a34a)",
    color: "#fff",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    transition: "0.2s",
  },
  cancelBtn: {
    flex: 1,
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.05)",
    color: "#e5e7eb",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "0.2s",
  },
  title: {
    fontSize: "16px",
    fontWeight: "600",
    marginBottom: "10px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
};
