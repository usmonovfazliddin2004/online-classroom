import { useState } from "react";

export default function MessageInput({
  newMessage,
  setNewMessage,
  onSendMessage,
  onFileUpload,
  onLocationClick,
  showFileMenu,
  setShowFileMenu,
}) {
  const [focused, setFocused] = useState(null);

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      onSendMessage();
    }
  };

  const inputStyle = {
    flex: 1,
    padding: "10px",
    background: "rgba(0, 0, 0, 0.3)",
    border:
      focused === "message"
        ? "1px solid #3b82f6"
        : "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: "6px",
    color: "#fff",
    fontSize: "14px",
    outline: "none",
    boxShadow:
      focused === "message" ? "0 0 0 3px rgba(59,130,246,0.25)" : "none",
    transition: "all 0.25s ease",
  };

  return (
    <div
      style={{
        display: "flex",
        gap: "10px",
        padding: "10px",
        background: "rgba(0,0,0,0.2)",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "10px",
      }}
    >
      <input
        type="text"
        placeholder="Xabar yozing..."
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        onFocus={() => setFocused("message")}
        onBlur={() => setFocused(null)}
        style={inputStyle}
      />
      <button
        onClick={onSendMessage}
        style={{
          background: "rgba(34, 197, 94, 0.2)",
          border: "1px solid rgba(34, 197, 94, 0.5)",
          color: "#86efac",
          padding: "10px 16px",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: "600",
        }}
      >
        📤 Yuborish
      </button>
      <div
        style={{ position: "relative" }}
        onMouseEnter={() => {
          clearTimeout(window.fileMenuTimeout);
          setShowFileMenu(true);
        }}
        onMouseLeave={() => {
          window.fileMenuTimeout = setTimeout(() => {
            setShowFileMenu(false);
          }, 200);
        }}
      >
        <button
          style={{
            background: "transparent",
            border: "none",
            fontSize: "20px",
            cursor: "pointer",
            color: "#9ca3af",
            transition: "0.2s",
            transform: showFileMenu ? "rotate(45deg)" : "rotate(0deg)",
          }}
        >
          📎
        </button>

        {showFileMenu && (
          <div
            style={{
              position: "absolute",
              bottom: "45px",
              right: "0",
              minWidth: "180px",
              background: "#1f2937",
              borderRadius: "10px",
              padding: "8px 0",
              boxShadow: "0 8px 25px rgba(0,0,0,0.6)",
              zIndex: 9999,
              transform: "translateX(0%)",
            }}
            onMouseEnter={() => {
              clearTimeout(window.fileMenuTimeout);
              setShowFileMenu(true);
            }}
            onMouseLeave={() => {
              setShowFileMenu(false);
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                borderRadius: "8px",
                cursor: "pointer",
                color: "#e5e7eb",
                fontSize: "14px",
                transition: "0.2s",
              }}
            >
              <span>📷</span>
              <span>Photo / Video</span>
              <input
                type="file"
                hidden
                accept="image/*,video/*"
                onChange={onFileUpload}
              />
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                borderRadius: "8px",
                cursor: "pointer",
                color: "#e5e7eb",
                fontSize: "14px",
                transition: "0.2s",
              }}
            >
              <span>📄</span>
              <span>Document</span>
              <input type="file" hidden onChange={onFileUpload} />
            </label>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                borderRadius: "8px",
                cursor: "pointer",
                color: "#e5e7eb",
                fontSize: "14px",
                transition: "0.2s",
              }}
              onClick={() => {
                onLocationClick();
                setShowFileMenu(false);
              }}
            >
              📍 Location
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== RESPONSIVE STYLES ===== */
const responsiveStyles = `
  /* ===== TABLET (768px - 1023px) ===== */
  @media (max-width: 1023px) {
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    
    .no-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  }

  /* ===== MOBILE (767px and below) ===== */
  @media (max-width: 767px) {
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    
    .no-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  }
`;

// Add responsive styles to document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = responsiveStyles;
  document.head.appendChild(styleSheet);
}
