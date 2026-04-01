import { useEffect, useState } from "react";

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
  participants = [],
  joinedParticipants = [], // ✅ FIX: Use joinedParticipants instead of onlineParticipants
  currentUserId,
  isTeacher = false,
  remoteStream, // ✅ FIX: Add remoteStream prop for student view
}) {
  // ✅ FIX: Move all hooks BEFORE any conditional return
  // Ishtirokchilar paneli uchun state
  const [panelPosition, setPanelPosition] = useState({
    x: window.innerWidth - 300,
    y: 20,
  });

  const [panelSize, setPanelSize] = useState({
    width: 280,
    height: 400,
  });

  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const [panelDragOffset, setPanelDragOffset] = useState({ x: 0, y: 0 });

  const [isResizingPanel, setIsResizingPanel] = useState(false);
  const [panelResizeStart, setPanelResizeStart] = useState({ x: 0, y: 0 });
  const [panelStartSize, setPanelStartSize] = useState({ width: 0, height: 0 });

  // Early return if no localStream
  if (!localStream) return null;

  // ✅ FIX: Participant status logic - joined vs pending
  const getParticipantStatus = (participantId) => {
    // O'qituvchi har doim online hisoblanadi
    if (participantId === currentUserId) return "online";
    // Faqat qo'shilgan ishtirokchilarni tekshirish
    if (joinedParticipants.includes(participantId)) return "online";
    return "pending";
  };

  // Ishtirokchilarni to'liq ismi bilan ko'rsatish
  const getParticipantName = (participant) => {
    if (participant.users) {
      return (
        `${participant.users.first_name || ""} ${participant.users.last_name || ""}`.trim() ||
        participant.student_id
      );
    }
    return participant.student_id;
  };

  // Status bo'yicha ishtirokchilarni guruhlash
  const onlineList = participants.filter(
    (p) => getParticipantStatus(p.student_id) === "online",
  );
  const pendingList = participants.filter(
    (p) => getParticipantStatus(p.student_id) === "pending",
  );

  const handlePanelMouseDown = (e) => {
    e.stopPropagation();
    setIsDraggingPanel(true);
    setPanelDragOffset({
      x: e.clientX - panelPosition.x,
      y: e.clientY - panelPosition.y,
    });
  };

  const handlePanelMouseMove = (e) => {
    if (!isDraggingPanel) return;
    const newX = e.clientX - panelDragOffset.x;
    const newY = e.clientY - panelDragOffset.y;

    // Ekran chegaralariga moslashtirish
    const maxX = window.innerWidth - panelSize.width;
    const maxY = window.innerHeight - panelSize.height;

    setPanelPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  };

  const handlePanelMouseUp = () => {
    setIsDraggingPanel(false);
  };

  const handlePanelResizeMouseDown = (e) => {
    e.stopPropagation();
    setIsResizingPanel(true);
    setPanelResizeStart({
      x: e.clientX,
      y: e.clientY,
    });
    setPanelStartSize({
      width: panelSize.width,
      height: panelSize.height,
    });
  };

  const handlePanelResizeMouseMove = (e) => {
    if (!isResizingPanel) return;
    const dx = e.clientX - panelResizeStart.x;
    const dy = e.clientY - panelResizeStart.y;

    const newWidth = Math.max(250, panelStartSize.width + dx);
    const newHeight = Math.max(250, panelStartSize.height + dy);

    // Ekran chegaralariga moslashtirish
    const maxX = window.innerWidth - newWidth;
    const maxY = window.innerHeight - newHeight;

    setPanelSize({
      width: newWidth,
      height: newHeight,
    });

    // Agar panel o'ng yoki pastga chiqib ketsa, pozitsiyasini sozlash
    setPanelPosition(prev => ({
      x: Math.min(prev.x, maxX),
      y: Math.min(prev.y, maxY),
    }));
  };

  const handlePanelResizeMouseUp = () => {
    setIsResizingPanel(false);
  };

  useEffect(() => {
    if (isDraggingPanel) {
      window.addEventListener("mousemove", handlePanelMouseMove);
      window.addEventListener("mouseup", handlePanelMouseUp);
      document.body.style.userSelect = "none";
    }
    return () => {
      window.removeEventListener("mousemove", handlePanelMouseMove);
      window.removeEventListener("mouseup", handlePanelMouseUp);
      document.body.style.userSelect = "auto";
    };
  }, [isDraggingPanel]);

  useEffect(() => {
    if (isResizingPanel) {
      window.addEventListener("mousemove", handlePanelResizeMouseMove);
      window.addEventListener("mouseup", handlePanelResizeMouseUp);
      document.body.style.userSelect = "none";
    }
    return () => {
      window.removeEventListener("mousemove", handlePanelResizeMouseMove);
      window.removeEventListener("mouseup", handlePanelResizeMouseUp);
      document.body.style.userSelect = "auto";
    };
  }, [isResizingPanel]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }

    // ✅ FIX: Remove incorrect assignment of localStream to remoteVideoRef
    // This was causing duplicate/black video issue
    // Only assign remoteStream to remoteVideoRef
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [localStream, remoteStream]);

  return (
    <>
      {/* 🖥 MAIN (teacher video va ekrani) */}
      {/* 🖥 MAIN VIDEO (faqat remote bo‘lsa chiqadi) */}
      {remoteVideoRef?.current?.srcObject && (
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
      )}

      {/* 🎥 YOU (faqat teacherga ko'rinadi) */}
      {!isTeacher ? null : (
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

          {/* Qatnashuvchilar soni (faqat teacherga ko'rinadi) */}
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
      )}

      {/* 📊 Qatnashuvchilar ro'yxati (faqat teacherga ko'rinadi) */}
      {!isTeacher ? null : (
        <div
          style={{
            position: "fixed",
            left: panelPosition.x,
            top: panelPosition.y,
            width: panelSize.width,
            height: panelSize.height,
            background: "rgba(0,0,0,0.85)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "12px",
            padding: "14px",
            zIndex: 1001,
            overflow: "auto",
            backdropFilter: "blur(10px)",
            cursor: "grab",
          }}
          onMouseDown={handlePanelMouseDown}
        >
          <h4
            style={{
              margin: "0 0 12px 0",
              fontSize: "14px",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            📊 Dars ishtirokchilari
            <span
              style={{
                fontSize: "11px",
                background: "rgba(59,130,246,0.3)",
                padding: "2px 8px",
                borderRadius: "10px",
                color: "#93c5fd",
              }}
            >
              {onlineList.length}/{participantsCount}
            </span>
          </h4>

          {/* Online ishtirokchilar */}
          {onlineList.length > 0 && (
            <div style={{ marginBottom: "12px" }}>
              <div
                style={{
                  fontSize: "11px",
                  color: "#4ade80",
                  marginBottom: "6px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    background: "#22c55e",
                    borderRadius: "50%",
                    display: "inline-block",
                  }}
                ></span>
                Darsda ({onlineList.length})
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "4px" }}
              >
                {onlineList.map((participant) => (
                  <div
                    key={participant.student_id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "6px 8px",
                      background: "rgba(34, 197, 94, 0.1)",
                      border: "1px solid rgba(34, 197, 94, 0.2)",
                      borderRadius: "6px",
                      fontSize: "12px",
                      color: "#4ade80",
                    }}
                  >
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        background: "#22c55e",
                        borderRadius: "50%",
                        display: "inline-block",
                        boxShadow: "0 0 6px rgba(34, 197, 94, 0.5)",
                      }}
                    ></span>
                    <span
                      style={{
                        flex: 1,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {getParticipantName(participant)}
                    </span>
                    {participant.student_id === currentUserId && (
                      <span style={{ fontSize: "10px", opacity: 0.6 }}>
                        Siz
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending ishtirokchilar */}
          {pendingList.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#facc15",
                  marginBottom: "6px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    background: "#eab308",
                    borderRadius: "50%",
                    display: "inline-block",
                  }}
                ></span>
                Kutilmoqda ({pendingList.length})
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "4px" }}
              >
                {pendingList.map((participant) => (
                  <div
                    key={participant.student_id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "6px 8px",
                      background: "rgba(234, 179, 8, 0.1)",
                      border: "1px solid rgba(234, 179, 8, 0.2)",
                      borderRadius: "6px",
                      fontSize: "12px",
                      color: "#facc15",
                    }}
                  >
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        background: "#eab308",
                        borderRadius: "50%",
                        display: "inline-block",
                      }}
                    ></span>
                    <span
                      style={{
                        flex: 1,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {getParticipantName(participant)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agar hech kim bo'lmasa */}
          {participants.length === 0 && (
            <div
              style={{
                fontSize: "12px",
                color: "#6b7280",
                textAlign: "center",
                padding: "10px",
              }}
            >
              Guruhda talabalar yo'q
            </div>
          )}

          {/* 🔥 RESIZE HANDLE */}
          <div
            onMouseDown={handlePanelResizeMouseDown}
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
        </div>
      )}

      {/* 🎥 STUDENT VIEW - O'quvchilar uchun video (o'qituvchini ko'radi) */}
      {!isTeacher && remoteStream && (
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
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "12px",
              border: "2px solid rgba(59, 130, 246, 0.5)",
              background: "#000",
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

          {/* Qatnashuvchilar soni (talabaga ham ko'rinadi) */}
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

          {/* O'qituvchi ekrani yorlig'i */}
          <div
            style={{
              position: "absolute",
              bottom: "8px",
              left: "8px",
              background: "rgba(59, 130, 246, 0.8)",
              color: "#fff",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "11px",
              fontWeight: "600",
            }}
          >
            👨‍🏫 O'qituvchi
          </div>
        </div>
      )}
    </>
  );
}
