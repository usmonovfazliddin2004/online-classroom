export default function VideoChat({
  localStream,
  localVideoRef,
  remoteVideoRef,
  videoPosition,
  videoSize,
  remotePosition,
  onHandleMouseDown,
  onHandleRemoteMouseDown,
  onHandleResizeMouseDown,
  participantsCount,
}) {
  if (!localStream) return null;

  return (
    <>
      {/* 🖥 MAIN (studentlar chiqadi keyin) */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        onMouseDown={onHandleRemoteMouseDown}
        style={{
          position: "fixed",
          left: remotePosition.x,
          top: remotePosition.y,
          width: "400px",
          height: "250px",
          background: "#000",
          borderRadius: "12px",
          cursor: "grab",
          zIndex: 999,
        }}
      />

      {/* 🎥 YOU */}
      <div
        style={{
          position: "fixed",
          left: videoPosition.x,
          top: videoPosition.y,
          width: videoSize.width,
          height: videoSize.height,
          zIndex: 1000,
        }}
      >
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          onMouseDown={onHandleMouseDown}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "12px",
            border: "2px solid rgba(255,255,255,0.3)",
            background: "#000",
            cursor: "grab",
          }}
        />

        {/* 🔥 RESIZE HANDLE */}
        <div
          onMouseDown={onHandleResizeMouseDown}
          style={{
            position: "absolute",
            right: "0",
            bottom: "0",
            width: "16px",
            height: "16px",
            background: "rgba(255,255,255,0.6)",
            cursor: "nwse-resize",
            borderRadius: "4px",
          }}
        />

        {/* Qatnashuvchilar soni */}
        <div
          style={{
            position: "absolute",
            top: "8px",
            left: "8px",
            background: "rgba(0,0,0,0.7)",
            color: "#fff",
            padding: "6px 10px",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: "600",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          📊 {participantsCount || 0} kishi
        </div>
      </div>
    </>
  );
}