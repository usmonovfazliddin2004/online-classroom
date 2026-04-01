import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function LessonModal({
  showScheduleModal,
  setShowScheduleModal,
  scheduleTitle,
  setScheduleTitle,
  scheduleDesc,
  setScheduleDesc,
  scheduleDate,
  setScheduleDate,
  onScheduleLesson,
  getInputStyle,
  setFocused,
  showEditModal,
  setShowEditModal,
  editTitle,
  setEditTitle,
  editDesc,
  setEditDesc,
  editDate,
  setEditDate,
  onUpdateScheduledLesson,
  showShareModal,
  setShowShareModal,
  selectedGroups,
  setSelectedGroups,
  filteredGroups,
  search,
  setSearch,
  onShareToGroups,
}) {
  // Schedule Modal
  if (showScheduleModal) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.7)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            padding: "28px",
            borderRadius: "20px",
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            color: "#fff",
            animation: "fadeIn 0.3s ease",
          }}
        >
          <h3
            style={{
              fontSize: "20px",
              fontWeight: "600",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            📅 Online dars belgilash
          </h3>

          <input
            type="text"
            placeholder="Dars mavzusi..."
            value={scheduleTitle}
            onChange={(e) => setScheduleTitle(e.target.value)}
            style={getInputStyle("title")}
            onFocus={() => setFocused("title")}
            onBlur={() => setFocused(null)}
          />

          <input
            type="text"
            placeholder="Izoh (ixtiyoriy)..."
            value={scheduleDesc}
            onChange={(e) => setScheduleDesc(e.target.value)}
            style={getInputStyle("desc")}
            onFocus={() => setFocused("desc")}
            onBlur={() => setFocused(null)}
          />

          <DatePicker
            selected={scheduleDate}
            onChange={(date) => setScheduleDate(date)}
            showTimeSelect
            dateFormat="Pp"
            placeholderText="Sana va vaqtni tanlang..."
            className="inputDate"
            onFocus={() => setFocused("date")}
            onBlur={() => setFocused(null)}
          />

          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "15px",
            }}
          >
            <button
              onClick={() => setShowScheduleModal(false)}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "10px",
                border: "none",
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              ❌ Bekor qilish
            </button>

            <button
              onClick={onScheduleLesson}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "10px",
                border: "none",
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
                color: "#fff",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              🚀 Yuborish
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Edit Modal
  if (showEditModal) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.7)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            padding: "28px",
            borderRadius: "20px",
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            color: "#fff",
            animation: "fadeIn 0.3s ease",
          }}
        >
          <h3
            style={{
              fontSize: "20px",
              fontWeight: "600",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            ✏️ Darsni tahrirlash
          </h3>

          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "10px",
              color: "#fff",
              fontSize: "14px",
              outline: "none",
              transition: "all 0.25s ease",
              backdropFilter: "blur(8px)",
              WebkitAppearance: "none",
              marginBottom: "16px",
            }}
          />

          <input
            type="text"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "10px",
              color: "#fff",
              fontSize: "14px",
              outline: "none",
              transition: "all 0.25s ease",
              backdropFilter: "blur(8px)",
              WebkitAppearance: "none",
              marginBottom: "16px",
            }}
          />

          <DatePicker
            selected={editDate}
            onChange={(date) => setEditDate(date)}
            showTimeSelect
            dateFormat="Pp"
            className="inputDate"
          />

          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "15px",
            }}
          >
            <button
              onClick={() => setShowEditModal(false)}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "10px",
                border: "none",
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              ❌ Bekor qilish
            </button>

            <button
              onClick={onUpdateScheduledLesson}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "10px",
                border: "none",
                background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                color: "#fff",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              💾 Saqlash
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Share Modal
  if (showShareModal) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.7)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            padding: "28px",
            borderRadius: "20px",
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            color: "#fff",
            animation: "fadeIn 0.3s ease",
          }}
        >
          <h3
            style={{
              fontSize: "20px",
              fontWeight: "600",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            📤 Qaysi guruhga yuborilsin?
          </h3>

          <input
            type="text"
            placeholder="🔍 Guruh qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              marginBottom: "14px",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.1)",
              outline: "none",
              background: "rgba(255,255,255,0.06)",
              color: "#fff",
              fontSize: "14px",
              backdropFilter: "blur(6px)",
            }}
          />

          <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
            <button
              onClick={() => setSelectedGroups(filteredGroups.map((g) => g.id))}
              style={{
                padding: "6px 12px",
                borderRadius: "999px",
                border: "none",
                background: "rgba(34,197,94,0.2)",
                color: "#86efac",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              ✔ Hammasi
            </button>

            <button
              onClick={() => setSelectedGroups([])}
              style={{
                padding: "6px 12px",
                borderRadius: "999px",
                border: "none",
                background: "rgba(239,68,68,0.2)",
                color: "#fca5a5",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              ✖ Tozalash
            </button>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              maxHeight: "200px",
              paddingRight: "4px",
            }}
            className="no-scrollbar"
          >
            {filteredGroups.length === 0 && (
              <p style={{ textAlign: "center", opacity: 0.6 }}>
                😕 Guruh topilmadi
              </p>
            )}

            {filteredGroups.map((g) => (
              <div
                key={g.id}
                onClick={() => {
                  if (selectedGroups.includes(g.id)) {
                    setSelectedGroups((prev) => prev.filter((id) => id !== g.id));
                  } else {
                    setSelectedGroups((prev) => [...prev, g.id]);
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "14px",
                  borderRadius: "14px",
                  background: selectedGroups.includes(g.id)
                    ? "linear-gradient(135deg, rgba(59,130,246,0.4), rgba(37,99,235,0.4))"
                    : "rgba(255,255,255,0.05)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  border: selectedGroups.includes(g.id)
                    ? "1px solid rgba(59,130,246,0.5)"
                    : "1px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!selectedGroups.includes(g.id)) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                    e.currentTarget.style.transform = "scale(1.02)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!selectedGroups.includes(g.id)) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.transform = "scale(1)";
                  }
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedGroups.includes(g.id)}
                  readOnly
                  style={{
                    transform: "scale(1.2)",
                    cursor: "pointer",
                  }}
                />

                <span style={{ fontSize: "14px" }}>{g.name}</span>
              </div>
            ))}
          </div>

          {selectedGroups.length > 0 && (
            <p style={{ marginTop: "10px", fontSize: "13px", opacity: 0.7 }}>
              ✅ Tanlanganlar: {selectedGroups.length} ta
            </p>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "10px",
              marginTop: "15px",
            }}
          >
            <button
              onClick={() => setShowShareModal(false)}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "12px",
                border: "none",
                background: "rgba(255,255,255,0.08)",
                color: "#e5e7eb",
                fontSize: "14px",
                cursor: "pointer",
                transition: "0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.15)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.08)")
              }
            >
              ❌ Bekor qilish
            </button>

            <button
              onClick={onShareToGroups}
              disabled={selectedGroups.length === 0}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "12px",
                border: "none",
                background:
                  selectedGroups.length === 0
                    ? "rgba(59,130,246,0.3)"
                    : "linear-gradient(135deg, #3b82f6, #2563eb)",
                color: "#fff",
                fontWeight: "600",
                fontSize: "14px",
                cursor:
                  selectedGroups.length === 0 ? "not-allowed" : "pointer",
                transition: "0.2s",
                boxShadow:
                  selectedGroups.length === 0
                    ? "none"
                    : "0 4px 15px rgba(59,130,246,0.4)",
              }}
            >
              🚀 Yuborish ({selectedGroups.length})
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}