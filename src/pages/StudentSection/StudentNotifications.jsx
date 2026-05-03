import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

export default function StudentNotifications() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [accessCode, setAccessCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          toast.error("Foydalanuvchi topilmadi");
          setLoading(false);
          return;
        }

        // Fetch quiz assignments for this student
        const { data, error } = await supabase
          .from("quiz_assignments")
          .select(
            `
    *,
    quizzes!fk_quiz (
      id,
      teacher_id,
      title,
      description,
      time_limit,
      deadline,
      created_at
    )
  `,
          )
          .eq("student_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching assignments:", error);
          toast.error("Topshiriqlarni yuklashda xatolik");
          return;
        }

        console.log("Fetched assignments:", data);
        setAssignments(data || []);
      } catch (err) {
        console.error("Error:", err);
        toast.error("Xatolik yuz berdi");
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, []);

  const handleStartTest = (assignment) => {
    setSelectedAssignment(assignment);
    setAccessCode("");
    setShowCodeModal(true);
  };

  const verifyAccessCode = async (assignment) => {
    if (!accessCode.trim()) {
      toast.error("Kirish kodini kiriting");
      return;
    }

    if (!assignment || !assignment.id) {
      toast.error("Topshiriq topilmadi");
      return;
    }

    const storedCode = assignment.access_code?.toUpperCase();
    const enteredCode = accessCode.trim().toUpperCase();

    console.log("assignment:", assignment);

    if (storedCode !== enteredCode) {
      toast.error("Kirish kodi noto'g'ri");
      return;
    }

    if (assignment.status === "completed") {
      toast.error("Siz bu testni allaqachon topshirgansiz");
      return;
    }

    setVerifying(true);

    try {
      const { error } = await supabase
        .from("quiz_assignments")
        .update({
          status: "in_progress",
          started_at: new Date().toISOString(),
        })
        .eq("id", assignment.id);

      if (error) {
        toast.error(error.message);
        return;
      }

      // 🔥 ENG MUHIM QISM
      console.log("REDIRECT BO'LYAPTI");

      navigate(`/student/take-quiz/${assignment.quiz_id}/${assignment.id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return (
          <span style={styles.statusBadge}>
            <span style={styles.statusDotPending}></span>
            Kutilmoqda
          </span>
        );
      case "in_progress":
        return (
          <span
            style={{
              ...styles.statusBadge,
              background: "rgba(251, 191, 36, 0.15)",
              color: "#fbbf24",
            }}
          >
            <span style={styles.statusDotProgress}></span>
            Davom etmoqda
          </span>
        );
      case "completed":
        return (
          <span
            style={{
              ...styles.statusBadge,
              background: "rgba(34, 197, 94, 0.15)",
              color: "#6ee7b7",
            }}
          >
            <span style={styles.statusDotCompleted}></span>
            Topshirilgan
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Belgilanmagan";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Noto'g'ri sana";
    return date.toLocaleString("uz-UZ", {
      year: "numeric",
      month: "2-digit", // 🔥 long o‘rniga
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isPastDeadline = (deadline) => {
    return new Date(deadline) < new Date();
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>📢 Bildirishnomalar</h1>
      <p style={styles.subtitle}>Sizga topshirilgan testlar ro'yxati</p>

      {assignments.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📭</div>
          <h3>Hozircha testlar yo'q</h3>
          <p>Sizga hali hech qanday test topshirilmagan.</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {assignments.map((assignment) => (
            <div key={assignment.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.cardTitle}>
                  <span style={styles.testIcon}>📝</span>
                  <h3 style={styles.cardTitleText}>
                    {assignment.quizzes?.title || "Test"}
                  </h3>
                </div>
                {getStatusBadge(assignment.status)}
              </div>

              {assignment.quizzes?.description && (
                <p style={styles.description}>
                  {assignment.quizzes.description}
                </p>
              )}

              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <span style={styles.infoIcon}>⏱️</span>
                  <span style={styles.infoText}>
                    {assignment.quizzes?.time_limit} daqiqa
                  </span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoIcon}>📅</span>
                  <span style={styles.infoText}>
                    {formatDate(assignment.quizzes?.deadline)}
                  </span>
                </div>
                {assignment.student_group && (
                  <div style={styles.infoItem}>
                    <span style={styles.infoIcon}>👥</span>
                    <span style={styles.infoText}>
                      {assignment.student_group}
                    </span>
                  </div>
                )}
                {assignment.status === "completed" &&
                  assignment.score !== null && (
                    <div style={styles.infoItem}>
                      <span style={styles.infoIcon}>🏆</span>
                      <span
                        style={{
                          ...styles.infoText,
                          fontWeight: "bold",
                          color: "#6ee7b7",
                        }}
                      >
                        {assignment.score}%
                      </span>
                    </div>
                  )}
              </div>

              {/* Access Code Display for pending and in_progress tests */}
              {(assignment.status === "pending" ||
                assignment.status === "in_progress") &&
                assignment.access_code && (
                  <div style={styles.accessCodeBox}>
                    <span style={styles.accessCodeLabel}>🔑 Kirish kodi:</span>
                    <span style={styles.accessCodeValue}>
                      {assignment.access_code}
                    </span>
                    <span style={styles.accessCodeHint}>
                      {assignment.status === "in_progress"
                        ? "(Test davom etmoqda - shu kod bilan kirishingiz mumkin)"
                        : "(Shu kodni kiriting)"}
                    </span>
                  </div>
                )}
              {(assignment.status === "pending" ||
                assignment.status === "in_progress") &&
                !assignment.access_code && (
                  <div
                    style={{
                      ...styles.accessCodeBox,
                      background: "rgba(239, 68, 68, 0.1)",
                      borderColor: "rgba(239, 68, 68, 0.2)",
                    }}
                  >
                    <span
                      style={{ ...styles.accessCodeLabel, color: "#f87171" }}
                    >
                      ⚠️ Kirish kodi topilmadi
                    </span>
                    <span style={styles.accessCodeHint}>
                      O'qituvchidan kirish kodini so'rang
                    </span>
                  </div>
                )}

              {assignment.status === "completed" && assignment.started_at && (
                <div style={styles.completedInfo}>
                  <p>Topshirilgan: {formatDate(assignment.submitted_at)}</p>
                </div>
              )}

              <div style={styles.cardFooter}>
                {assignment.status === "pending" && (
                  <>
                    {isPastDeadline(assignment.quizzes?.deadline) ? (
                      <button
                        style={{ ...styles.startBtn, ...styles.disabledBtn }}
                        disabled
                      >
                        Muddat tugagan
                      </button>
                    ) : (
                      <button
                        style={styles.startBtn}
                        onClick={() => handleStartTest(assignment)}
                      >
                        🚀 Testni boshlash
                      </button>
                    )}
                  </>
                )}
                {assignment.status === "in_progress" && (
                  <button
                    style={{ ...styles.startBtn, ...styles.inProgressBtn }}
                    onClick={() => handleStartTest(assignment)}
                  >
                    ⏩ Davom ettirish
                  </button>
                )}
                {assignment.status === "completed" && (
                  <span style={styles.completedText}>Test topshirilgan</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Access Code Modal */}
      {showCodeModal && (
        <div
          style={styles.modalOverlay}
          onClick={() => setShowCodeModal(false)}
        >
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2>🔐 Testga kirish</h2>
              <button
                style={styles.modalCloseBtn}
                onClick={() => setShowCodeModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <p style={styles.modalText}>
                <strong>{selectedAssignment?.quizzes?.title}</strong> testini
                boshlash uchun yuqoridagi 6 xonali kirish kodini kiriting.
              </p>

              <div style={styles.codeInputWrapper}>
                <label style={styles.codeLabel}>Kirish kodi</label>
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  placeholder="XXXXXX"
                  maxLength={6}
                  style={styles.codeInput}
                  autoFocus
                />
              </div>

              <button
                style={styles.verifyBtn}
                onClick={() => {
                  verifyAccessCode(selectedAssignment);
                }}
                disabled={verifying || accessCode.length !== 6}
              >
                {verifying ? "Tekshirilmoqda..." : "Tasdiqlash va kirish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
  },
  title: {
    fontSize: "28px",
    fontWeight: "700",
    marginBottom: "8px",
    background: "linear-gradient(135deg, #22c55e, #3b82f6)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: {
    color: "rgba(255,255,255,0.6)",
    marginBottom: "32px",
    fontSize: "15px",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "400px",
    gap: "16px",
    color: "rgba(255,255,255,0.6)",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "3px solid rgba(255,255,255,0.1)",
    borderTopColor: "#22c55e",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
    gap: "24px",
  },
  card: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "20px",
    padding: "24px",
    transition: "all 0.3s ease",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "16px",
  },
  cardTitle: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  testIcon: {
    fontSize: "24px",
  },
  cardTitleText: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#fff",
    margin: 0,
  },
  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    background: "rgba(59, 130, 246, 0.15)",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "500",
    color: "#93c5fd",
  },
  statusDotPending: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#3b82f6",
  },
  statusDotProgress: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#fbbf24",
    animation: "pulse 2s infinite",
  },
  statusDotCompleted: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#22c55e",
  },
  description: {
    color: "rgba(255,255,255,0.6)",
    fontSize: "14px",
    lineHeight: "1.5",
    marginBottom: "16px",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginBottom: "16px",
  },
  infoItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  infoIcon: {
    fontSize: "16px",
  },
  infoText: {
    fontSize: "13px",
    color: "rgba(255,255,255,0.7)",
  },
  completedInfo: {
    padding: "12px",
    background: "rgba(34, 197, 94, 0.1)",
    borderRadius: "12px",
    marginBottom: "16px",
  },
  accessCodeBox: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    background: "rgba(59, 130, 246, 0.1)",
    border: "1px solid rgba(59, 130, 246, 0.2)",
    borderRadius: "12px",
    marginTop: "12px",
    flexWrap: "wrap",
  },
  accessCodeLabel: {
    fontSize: "13px",
    color: "#93c5fd",
    fontWeight: "500",
  },
  accessCodeValue: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#fff",
    fontFamily: "monospace",
    letterSpacing: "4px",
    background: "rgba(59, 130, 246, 0.2)",
    padding: "4px 12px",
    borderRadius: "8px",
  },
  accessCodeHint: {
    fontSize: "11px",
    color: "rgba(255,255,255,0.5)",
    flex: "1 1 100%",
  },
  cardFooter: {
    display: "flex",
    justifyContent: "center",
    paddingTop: "16px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
  },
  startBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 24px",
    background: "linear-gradient(135deg, #22c55e, #16a34a)",
    border: "none",
    borderRadius: "12px",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 15px rgba(34, 197, 94, 0.3)",
  },
  inProgressBtn: {
    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
    boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)",
  },
  disabledBtn: {
    background: "rgba(255,255,255,0.1)",
    cursor: "not-allowed",
    boxShadow: "none",
    color: "rgba(255,255,255,0.4)",
  },
  completedText: {
    color: "#6ee7b7",
    fontSize: "14px",
    fontWeight: "500",
  },
  emptyState: {
    textAlign: "center",
    padding: "64px 24px",
    background: "rgba(255,255,255,0.02)",
    border: "1px dashed rgba(255,255,255,0.1)",
    borderRadius: "20px",
  },
  emptyIcon: {
    fontSize: "48px",
    marginBottom: "16px",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    backdropFilter: "blur(4px)",
  },
  modal: {
    background: "linear-gradient(145deg, #1e293b, #0f172a)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "20px",
    padding: "32px",
    width: "90%",
    maxWidth: "420px",
    boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  modalCloseBtn: {
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.5)",
    fontSize: "24px",
    cursor: "pointer",
    width: "36px",
    height: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    transition: "all 0.2s",
  },
  modalBody: {
    textAlign: "center",
  },
  modalText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: "14px",
    lineHeight: "1.6",
    marginBottom: "24px",
  },
  codeInputWrapper: {
    marginBottom: "24px",
  },
  codeLabel: {
    display: "block",
    color: "rgba(255,255,255,0.5)",
    fontSize: "13px",
    marginBottom: "8px",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  codeInput: {
    width: "100%",
    padding: "16px",
    background: "rgba(255,255,255,0.05)",
    border: "2px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    color: "#fff",
    fontSize: "24px",
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: "8px",
    outline: "none",
    transition: "all 0.2s",
    fontFamily: "monospace",
  },
  verifyBtn: {
    width: "100%",
    padding: "14px 24px",
    background: "linear-gradient(135deg, #22c55e, #16a34a)",
    border: "none",
    borderRadius: "12px",
    color: "#fff",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s",
    boxShadow: "0 4px 15px rgba(34, 197, 94, 0.3)",
  },
};
