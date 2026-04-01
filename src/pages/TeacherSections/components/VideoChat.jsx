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
  onlineParticipants = [],
  currentUserId,
  isTeacher = false,
}) {
  if (!localStream) return null;

  // Ishtirokchilarni statusiga ko'ra ajratish
  const getParticipantStatus = (participantId) => {
    // O'qituvchi har doim online hisoblanadi
    if (participantId === currentUserId) return 'online';
    // Online ishtirokchilar ro'yxatida borligini tekshirish
    if (onlineParticipants.includes(participantId)) return 'online';
    return 'pending';
  };

  // Ishtirokchilarni to'liq ismi bilan ko'rsatish
  const getParticipantName = (participant) => {
    if (participant.users) {
      return `${participant.users.first_name || ''} ${participant.users.last_name || ''}`.trim() || participant.student_id;
    }
    return participant.student_id;
  };

  // Status bo'yicha ishtirokchilarni guruhlash
  const onlineList = participants.filter(p => getParticipantStatus(p.student_id) === 'online');
  const pendingList = participants.filter(p => getParticipantStatus(p.student_id) === 'pending');

  return (
    <>
      {/* 🖥 MAIN (teacher video va ekrani) */}
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
            right: "20px",
            top: "20px",
            width: "280px",
            background: "rgba(0,0,0,0.85)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "12px",
            padding: "14px",
            zIndex: 1001,
            maxHeight: "400px",
            overflowY: "auto",
            backdropFilter: "blur(10px)",
          }}
        >
          <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
            📊 Dars ishtirokchilari
            <span style={{ 
              fontSize: "11px", 
              background: "rgba(59,130,246,0.3)", 
              padding: "2px 8px", 
              borderRadius: "10px",
              color: "#93c5fd"
            }}>
              {onlineList.length}/{participantsCount}
            </span>
          </h4>

          {/* Online ishtirokchilar */}
          {onlineList.length > 0 && (
            <div style={{ marginBottom: "12px" }}>
              <div style={{ 
                fontSize: "11px", 
                color: "#4ade80", 
                marginBottom: "6px", 
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}>
                <span style={{ 
                  width: "6px", 
                  height: "6px", 
                  background: "#22c55e", 
                  borderRadius: "50%",
                  display: "inline-block"
                }}></span>
                Darsda ({onlineList.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
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
                    <span style={{ 
                      width: "8px", 
                      height: "8px", 
                      background: "#22c55e", 
                      borderRadius: "50%",
                      display: "inline-block",
                      boxShadow: "0 0 6px rgba(34, 197, 94, 0.5)"
                    }}></span>
                    <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {getParticipantName(participant)}
                    </span>
                    {participant.student_id === currentUserId && (
                      <span style={{ fontSize: "10px", opacity: 0.6 }}>Siz</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending ishtirokchilar */}
          {pendingList.length > 0 && (
            <div>
              <div style={{ 
                fontSize: "11px", 
                color: "#facc15", 
                marginBottom: "6px", 
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}>
                <span style={{ 
                  width: "6px", 
                  height: "6px", 
                  background: "#eab308", 
                  borderRadius: "50%",
                  display: "inline-block"
                }}></span>
                Kutilmoqda ({pendingList.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
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
                    <span style={{ 
                      width: "8px", 
                      height: "8px", 
                      background: "#eab308", 
                      borderRadius: "50%",
                      display: "inline-block"
                    }}></span>
                    <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {getParticipantName(participant)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agar hech kim bo'lmasa */}
          {participants.length === 0 && (
            <div style={{ 
              fontSize: "12px", 
              color: "#6b7280", 
              textAlign: "center", 
              padding: "10px" 
            }}>
              Guruhda talabalar yo'q
            </div>
          )}
        </div>
      )}

      {/* 🎥 STUDENT VIEW - O'quvchilar uchun video */}
      {!isTeacher && localStream && (
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
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "12px",
              border: "2px solid rgba(255,255,255,0.3)",
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
        </div>
      )}
    </>
  );
}
