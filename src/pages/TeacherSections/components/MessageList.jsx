export default function MessageList({
  messages,
  userId,
  editingId,
  editingText,
  setEditingText,
  setEditingId,
  onUpdateMessage,
  onDeleteMessage,
  messagesEndRef,
  messagesContainerRef,
  formatTime,
  getFileIcon,
}) {
  const getMessageContent = (msg) => {
    if (msg.message_type === "schedule") {
      let data;
      try {
        data = JSON.parse(msg.message);
      } catch {
        return <p>❌ Xato schedule</p>;
      }

      return (
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(37,99,235,0.2))",
            border: "1px solid rgba(59,130,246,0.3)",
            borderRadius: "12px",
            padding: "10px",
            maxWidth: "260px",
          }}
        >
          <p
            style={{
              margin: 0,
              fontWeight: "600",
              fontSize: "13px",
            }}
          >
            📢 Online dars
          </p>

          <p style={{ margin: "6px 0 2px", fontSize: "13px" }}>
            📚 {data.title}
          </p>

          {data.desc && (
            <p
              style={{
                margin: "2px 0",
                fontSize: "12px",
                opacity: 0.8,
              }}
            >
              📝 {data.desc}
            </p>
          )}

          <p
            style={{
              margin: "4px 0 0",
              fontSize: "12px",
              opacity: 0.7,
            }}
          >
            ⏰ {new Date(data.date).toLocaleString("uz-UZ")}
          </p>

          <p
            style={{
              marginTop: "6px",
              fontSize: "11px",
              color: "#93c5fd",
            }}
          >
            ❗ Vaqtida qatnashing
          </p>
        </div>
      );
    }

    if (msg.message_type === "location") {
      let coords;
      try {
        coords = JSON.parse(msg.message);
      } catch {
        return <p>❌ Location xato</p>;
      }

      const mapUrl = `https://maps.google.com/maps?q=${coords.lat},${coords.lng}&z=15&output=embed`;

      return (
        <div
          onClick={() =>
            window.open(
              `https://www.google.com/maps?q=${coords.lat},${coords.lng}`,
              "_blank",
            )
          }
          style={{
            cursor: "pointer",
            borderRadius: "12px",
            overflow: "hidden",
            marginBottom: "5px",
          }}
        >
          <iframe
            src={mapUrl}
            width="250"
            height="150"
            style={{ border: "none" }}
          />
        </div>
      );
    }

    if (msg.message_type === "audio") {
      return (
        <audio controls src={msg.message} style={{ maxWidth: "250px" }} />
      );
    }

    if (msg.message_type === "video") {
      return (
        <video controls src={msg.message} style={{ maxWidth: "250px" }} />
      );
    }

    if (msg.message_type === "file") {
      return (
        <div
          style={{
            background: "rgba(255,255,255,0.08)",
            padding: "10px",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            maxWidth: "250px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span style={{ fontSize: "24px" }}>{getFileIcon(msg.message)}</span>

            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  color: "#fff",
                  fontWeight: "500",
                }}
              >
                {msg.message.split("/").pop().slice(0, 25)}
              </p>

              <a
                href={msg.message}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: "12px",
                  color: "#60a5fa",
                  textDecoration: "none",
                }}
              >
                📥 Yuklab olish
              </a>
            </div>
          </div>
        </div>
      );
    }

    return <p style={{ margin: "0 0 5px 0", fontSize: "14px" }}>{msg.message}</p>;
  };

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        padding: "10px",
        gap: "6px",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
      ref={messagesContainerRef}
      className="no-scrollbar"
    >
      {messages.map((msg) => (
        <div
          key={msg.id}
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "10px 65px 10px 14px",
            borderRadius: "14px",
            maxWidth: "70%",
            fontSize: "14px",
            position: "relative",
            alignSelf: msg.sender_id === userId ? "flex-end" : "flex-start",
            background:
              msg.sender_id === userId
                ? "rgba(59, 130, 246, 0.2)"
                : "rgba(255, 255, 255, 0.08)",
          }}
          onMouseEnter={(e) => {
            const actions = e.currentTarget.querySelector(".action-buttons");
            if (actions) actions.style.opacity = 1;
          }}
          onMouseLeave={(e) => {
            const actions = e.currentTarget.querySelector(".action-buttons");
            if (actions) actions.style.opacity = 0;
          }}
        >
          <p
            style={{
              fontSize: "15px",
              opacity: 0.7,
              margin: "0 0 5px 0",
              fontWeight: "600",
            }}
          >
            {msg.users?.first_name || "User"} {msg.users?.last_name || ""}
          </p>

          {editingId === msg.id ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginTop: "4px",
              }}
            >
              <input
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                placeholder={
                  msg.message_type === "text"
                    ? "Xabarni tahrirlash..."
                    : "Izoh qo'shish..."
                }
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  fontSize: "13px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(0,0,0,0.2)",
                  color: "#fff",
                  outline: "none",
                }}
              />

              <button
                onClick={() => onUpdateMessage(msg.id, msg.message_type)}
                style={{
                  padding: "6px 8px",
                  borderRadius: "6px",
                  border: "none",
                  background: "rgba(34,197,94,0.2)",
                  color: "#86efac",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                ✔
              </button>
            </div>
          ) : (
            getMessageContent(msg)
          )}

          {msg.caption && msg.message_type !== "text" && (
            <p
              style={{
                fontSize: "12px",
                opacity: 0.8,
                marginTop: "4px",
              }}
            >
              {msg.caption}
            </p>
          )}

          <p
            style={{
              fontSize: "11px",
              opacity: 0.6,
              marginTop: "6px",
              alignSelf: "flex-start",
            }}
          >
            {formatTime(msg.created_at)}

            {msg.updated_at && msg.updated_at !== msg.created_at && (
              <span
                style={{
                  marginLeft: "6px",
                  fontSize: "10px",
                  opacity: 0.5,
                  fontStyle: "italic",
                }}
              >
                edited
              </span>
            )}
          </p>

          {msg.sender_id === userId && (
            <div
              style={{
                position: "absolute",
                top: "6px",
                right: "8px",
                display: "flex",
                gap: "6px",
                opacity: 0,
                transition: "0.2s",
              }}
              className="action-buttons"
            >
              <button
                onClick={() => {
                  setEditingId(msg.id);
                  if (msg.message_type === "text") {
                    setEditingText(msg.message);
                  } else {
                    setEditingText(msg.caption || "");
                  }
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                ✏️
              </button>

              <button
                onClick={() => onDeleteMessage(msg.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  color: "#f87171",
                }}
              >
                🗑️
              </button>
            </div>
          )}
        </div>
      ))}
      <div ref={messagesEndRef} />
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
