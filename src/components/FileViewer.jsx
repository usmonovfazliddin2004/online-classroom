import React from "react";

// Fayl turini aniqlash
const getFileType = (url, originalName) => {
  const name = originalName || url;
  if (name.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)) return "image";
  if (name.match(/\.(pdf)$/i)) return "pdf";
  if (name.match(/\.(mp4|webm|ogg|mov|avi)$/i)) return "video";
  if (name.match(/\.(mp3|wav|ogg)$/i)) return "audio";
  return "other";
};

export default function FileViewer({ file, onClose }) {
  if (!file) return null;

  const { url, originalName } = typeof file === "string" ? { url: file } : file;
  const type = getFileType(url, originalName);

  // URL ni tuzatish (https:/ -> https://)
  let fixedUrl = url;
  if (url.startsWith('https:/') && !url.startsWith('https://')) {
    fixedUrl = 'https://' + url.substring(8);
  }

  return (
    <div 
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.9)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1e293b",
          padding: "20px",
          borderRadius: "16px",
          maxWidth: "90vw",
          maxHeight: "90vh",
          width: "900px",
          position: "relative",
        }}
      >
        {/* Yopish tugmasi */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            background: "#ef4444",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "8px 16px",
            cursor: "pointer",
            fontSize: "16px",
            zIndex: 10,
          }}
        >
          ✕ Yopish
        </button>

        {/* Fayl nomi */}
        <h3 style={{ color: "white", marginBottom: "15px", textAlign: "center" }}>
          {originalName || "Fayl"}
        </h3>

        {/* Rasm */}
        {type === "image" && (
          <img 
            src={fixedUrl} 
            alt={originalName} 
            style={{ 
              maxWidth: "100%", 
              maxHeight: "70vh", 
              display: "block",
              margin: "0 auto",
              borderRadius: "8px",
            }} 
          />
        )}

        {/* PDF */}
        {type === "pdf" && (
          <iframe 
            src={fixedUrl} 
            title="PDF" 
            style={{ 
              width: "100%", 
              height: "70vh",
              border: "none",
              borderRadius: "8px",
            }} 
          />
        )}

        {/* Video */}
        {type === "video" && (
          <video 
            src={fixedUrl} 
            controls 
            autoPlay
            style={{ 
              maxWidth: "100%", 
              maxHeight: "70vh",
              display: "block",
              margin: "0 auto",
              borderRadius: "8px",
            }} 
          />
        )}

        {/* Audio */}
        {type === "audio" && (
          <div style={{ padding: "20px" }}>
            <audio 
              src={fixedUrl} 
              controls 
              autoPlay
              style={{ width: "100%" }} 
            />
          </div>
        )}

        {/* Boshqa fayllar (Word, Excel, va h.k.) */}
        {type === "other" && (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <p style={{ color: "#94a3b8", marginBottom: "20px", fontSize: "18px" }}>
              Bu faylni browserda to'g'ridan-to'g'ri ko'rsatib bo'lmaydi.
            </p>
            <div style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
              <a 
                href={fixedUrl} 
                download={originalName}
                style={{
                  background: "#22c55e",
                  color: "white",
                  padding: "12px 24px",
                  borderRadius: "10px",
                  textDecoration: "none",
                  fontSize: "16px",
                  fontWeight: "bold",
                }}
              >
                📥 Yuklab olish
              </a>
              <a 
                href={fixedUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  background: "#3b82f6",
                  color: "white",
                  padding: "12px 24px",
                  borderRadius: "10px",
                  textDecoration: "none",
                  fontSize: "16px",
                  fontWeight: "bold",
                }}
              >
                🔗 Yangi tabda ochish
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}