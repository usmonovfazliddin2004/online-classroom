export default function RecordingControls({
  isRecording,
  recordingType,
  setRecordingType,
  videoSource,
  setVideoSource,
  onStartRecording,
  onStopRecording,
  onStartVideoChat,
  onStopVideoChat,
  onSwitchVideoSource,
  recordedChunks,
  onUploadRecording,
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.05)",
        padding: "10px",
        borderRadius: "10px",
        border: "1px solid rgba(255,255,255,0.1)",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "10px",
          flexWrap: "wrap",
        }}
      >
        <select
          value={recordingType}
          onChange={(e) => setRecordingType(e.target.value)}
          disabled={isRecording}
          style={{
            flex: 1,
            padding: "10px",
            background: "rgba(0, 0, 0, 0.3)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "6px",
            color: "#fff",
            cursor: "pointer",
            minWidth: "120px",
          }}
        >
          <option value="audio">🎙️ Audio Dars</option>
          <option value="video">🎥 Video Dars</option>
        </select>

        <select
          value={videoSource}
          onChange={(e) => setVideoSource(e.target.value)}
          disabled={isRecording}
          style={{
            flex: 1,
            padding: "10px",
            background: "rgba(0, 0, 0, 0.3)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "6px",
            color: "#fff",
            cursor: "pointer",
            minWidth: "120px",
          }}
        >
          <option value="camera">🎥 Kamera</option>
          <option value="screen">🖥 Screen</option>
          <option value="both">🎥+🖥 Ikkalasi</option>
        </select>

        {!isRecording ? (
          <button
            onClick={onStartRecording}
            style={{
              background: "rgba(239, 68, 68, 0.2)",
              border: "1px solid rgba(239, 68, 68, 0.5)",
              color: "#f87171",
              padding: "10px 16px",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
              whiteSpace: "nowrap",
            }}
          >
            🔴 Recording Boshlang
          </button>
        ) : (
          <button
            onClick={onStopRecording}
            style={{
              background: "rgba(168, 85, 247, 0.2)",
              border: "1px solid rgba(168, 85, 247, 0.5)",
              color: "#d8b4fe",
              padding: "10px 16px",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
              whiteSpace: "nowrap",
            }}
          >
            ⏹️ Toxtatish
          </button>
        )}

        <button
          onClick={onStartVideoChat}
          style={{
            background: "rgba(239, 68, 68, 0.2)",
            border: "1px solid rgba(239, 68, 68, 0.5)",
            color: "#f87171",
            padding: "10px 16px",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "600",
            whiteSpace: "nowrap",
          }}
        >
          🎥 Live boshlash
        </button>

        <button
          onClick={onStopVideoChat}
          style={{
            background: "rgba(168, 85, 247, 0.2)",
            border: "1px solid rgba(168, 85, 247, 0.5)",
            color: "#d8b4fe",
            padding: "10px 16px",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "600",
            whiteSpace: "nowrap",
          }}
        >
          ⛔ Live to'xtatish
        </button>

        {isRecording && (
          <>
            <button
              onClick={() => onSwitchVideoSource("camera")}
              style={{
                background: "rgba(239, 68, 68, 0.2)",
                border: "1px solid rgba(239, 68, 68, 0.5)",
                color: "#f87171",
                padding: "10px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "600",
                whiteSpace: "nowrap",
              }}
            >
              🎥 Kamera
            </button>

            <button
              onClick={() => onSwitchVideoSource("screen")}
              style={{
                background: "rgba(239, 68, 68, 0.2)",
                border: "1px solid rgba(239, 68, 68, 0.5)",
                color: "#f87171",
                padding: "10px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "600",
                whiteSpace: "nowrap",
              }}
            >
              🖥 Screen
            </button>
          </>
        )}
      </div>

      {recordedChunks.length > 0 && (
        <div
          style={{
            background: "rgba(34, 197, 94, 0.1)",
            border: "1px solid rgba(34, 197, 94, 0.3)",
            padding: "12px",
            borderRadius: "6px",
            display: "flex",
            gap: "10px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <p style={{ margin: 0, whiteSpace: "nowrap" }}>✅ Recording tayyor!</p>
          <input
            type="text"
            placeholder="Dars nomini kiriting..."
            id="lessonTitle"
            style={{
              flex: 1,
              padding: "10px",
              background: "rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "14px",
              minWidth: "150px",
            }}
          />
          <button
            onClick={() =>
              onUploadRecording(
                document.getElementById("lessonTitle").value || "Dars",
              )
            }
            style={{
              background: "rgba(34, 197, 94, 0.2)",
              border: "1px solid rgba(34, 197, 94, 0.5)",
              color: "#86efac",
              padding: "10px 16px",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
              whiteSpace: "nowrap",
            }}
          >
            📤 Upload qilish
          </button>
        </div>
      )}
    </div>
  );
}