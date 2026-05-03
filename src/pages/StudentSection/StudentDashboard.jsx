import { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import { toast } from "react-toastify";
import StudentSettings from "../StudentSettings";

export default function StudentDashboard() {
  const [stats, setStats] = useState({
    courses: 0,
    requests: 0,
  });
  const [showRequests, setShowRequests] = useState(false);
  const [requestsList, setRequestsList] = useState([]);
  const [showCourses, setShowCourses] = useState(false);
  const [acceptedCourses, setAcceptedCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [lessonsByCourse, setLessonsByCourse] = useState({});
  const [loadingLessonsFor, setLoadingLessonsFor] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const uniqueRequests = (requests) => {
    const map = new Map();
    (requests || []).forEach((req) => {
      const key = `${req.course_id}:${req.status}`;
      if (!map.has(key)) map.set(key, req);
    });
    return Array.from(map.values());
  };

  useEffect(() => {
    const fetchStats = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: requests } = await supabase
        .from("course_requests")
        .select("*")
        .eq("student_id", user.id);

      const unique = uniqueRequests(requests || []);

      const { data: enrollments } = await supabase
        .from("course_requests")
        .select("course_id")
        .eq("student_id", user.id)
        .eq("status", "accepted");

      // ✅ unique course larni olish
      const uniqueCourses = (enrollments || []).reduce((acc, item) => {
        if (!acc.find((c) => c.course_id === item.course_id)) {
          acc.push(item);
        }
        return acc;
      }, []);

      setStats({
        requests: unique.length,
        courses: uniqueCourses.length, // ✅ endi to‘g‘ri
      });
    };

    fetchStats();
  }, []);

  const handleRequestsClick = async () => {
    if (showRequests) {
      setShowRequests(false);
      return;
    }

    setShowCourses(false); // 🔥 shu qo‘shildi

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: requests } = await supabase
      .from("course_requests")
      .select(
        `
      *,
      courses ( title )
    `,
      )
      .eq("student_id", user.id)
      .order("created_at", { ascending: false });

    const unique = uniqueRequests(requests || []);

    setRequestsList(unique);
    setStats((prev) => ({
      ...prev,
      requests: unique.length,
    }));
    setCurrentPage(1);
    setShowRequests(true);
  };

  const handleCoursesClick = async () => {
    if (showCourses) {
      setShowCourses(false);
      setSelectedCourseId(null);
      return;
    }

    setShowRequests(false);
    setSelectedCourseId(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: courses } = await supabase
      .from("course_requests")
      .select(
        `
        course_id,
        courses ( id, title, description )
      `,
      )
      .eq("student_id", user.id)
      .eq("status", "accepted")
      .order("created_at", { ascending: false });

    const uniqueCourses = (courses || []).reduce((acc, item) => {
      if (!acc.find((c) => c.course_id === item.course_id)) {
        acc.push(item);
      }
      return acc;
    }, []);

    setAcceptedCourses(uniqueCourses);
    setShowCourses(true);
  };

  const getStatusText = (status) => {
    if (status === "accepted") return "Qabul qilingan";
    if (status === "pending") return "Kutilmoqda";
    if (status === "rejected") return "Rad etilgan";
    return "Noma'lum";
  };

  const getStatusColor = (status) => {
    if (status === "accepted") return "#22c55e";
    if (status === "pending") return "#facc15";
    if (status === "rejected") return "#ef4444";
    return "#6b7280";
  };

  const toggleCourse = async (courseId) => {
    if (selectedCourseId === courseId) {
      setSelectedCourseId(null);
      return;
    }

    setSelectedCourseId(courseId);

    if (lessonsByCourse[courseId]) return;

    setLoadingLessonsFor(courseId);

    const { data: lessons, error } = await supabase
      .from("lessons")
      .select(
        `
        *,
        courses ( title )
      `,
      )
      .eq("course_id", courseId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Lessons error:", error);
    }

    // Parse source_files if it's a string (JSON)
    const parsedLessons = (lessons || []).map(lesson => ({
      ...lesson,
      source_files: lesson.source_files 
        ? (typeof lesson.source_files === 'string' 
            ? JSON.parse(lesson.source_files) 
            : lesson.source_files)
        : []
    }));

    setLessonsByCourse((prev) => ({
      ...prev,
      [courseId]: parsedLessons,
    }));
    setLoadingLessonsFor(null);
  };

  // pagination logic
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentRequests = requestsList.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(requestsList.length / itemsPerPage);

  // download file - improved version
  const downloadFile = async (url) => {
    try {
      if (!url) {
        toast.error("File topilmadi");
        return;
      }

      // url parametri object bo'lishi mumkin: { url, originalName }
      let fixedUrl = url;
      let fileName = null;
      if (typeof url === 'object' && url !== null) {
        fixedUrl = url.url;
        fileName = url.originalName;
      }
      if (typeof fixedUrl === 'string' && fixedUrl.startsWith('https:/') && !fixedUrl.startsWith('https://')) {
        fixedUrl = 'https://' + fixedUrl.substring(8);
      }
      if (!fileName) {
        fileName = fixedUrl.split("/").pop();
        fileName = decodeURIComponent(fileName).replace(/["}]/g, "");
      }

      toast.loading("Fayl yuklanmoqda...", { autoClose: false });
      const response = await fetch(fixedUrl);
      if (!response.ok) {
        throw new Error("Fayl yuklab bo‘lmadi");
      }
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.dismiss();
      toast.success(`"${fileName}" yuklandi`);
    } catch (err) {
      console.error(err);
      toast.dismiss();
      window.open(typeof url === 'object' ? url.url : url, '_blank');
    }
  };
  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Dashboard</h2>

      <div style={styles.grid}>
        <div style={styles.card} onClick={handleRequestsClick}>
          <h3>📩 So‘rovlar</h3>
          <p style={styles.number}>{stats.requests}</p>
        </div>

        <div style={styles.card} onClick={handleCoursesClick}>
          <h3>📚 Darslar</h3>
          <p style={styles.number}>{stats.courses}</p>
        </div>

        <div style={styles.card} onClick={() => setShowSettings(true)}>
          <h3>⚙️ Sozlamalar</h3>
          <p style={styles.number}>—</p>
        </div>
      </div>

      {showRequests && (
        <div style={styles.requestsSection}>
          <h3 style={{ marginBottom: "15px" }}>Yuborilgan so‘rovnomalar</h3>

          {requestsList.length === 0 ? (
            <p>So‘rovnomalar yo‘q.</p>
          ) : (
            <>
              <ul style={styles.requestsList}>
                {currentRequests.map((request, index) => (
                  <li key={request.id} style={styles.requestItem}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {/* 🔢 NUMBER BOX */}
                      <div
                        style={{
                          ...styles.numberBox,
                          background: getStatusColor(request.status),
                        }}
                      >
                        {indexOfFirst + index + 1}
                      </div>

                      {/* 📚 TITLE */}
                      <div>
                        <strong>
                          {request.courses?.title || "Noma‘lum kurs"}
                        </strong>
                        <p style={styles.date}>
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span
                      style={{
                        ...styles.status,
                        background: getStatusColor(request.status),
                      }}
                    >
                      {getStatusText(request.status)}
                    </span>
                  </li>
                ))}
              </ul>

              {/* ✅ Pagination */}
              {totalPages > 1 && (
                <div style={styles.pagination}>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      style={{
                        ...styles.pageBtn,
                        background:
                          currentPage === i + 1 ? "#22c55e" : "transparent",
                        color: currentPage === i + 1 ? "black" : "white",
                      }}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {showCourses && (
        <div style={styles.requestsSection}>
          <div style={styles.sectionHeader}>
            <h3 style={{ marginBottom: "15px" }}>Darslar</h3>
            <button
              onClick={() => {
                setShowCourses(false);
                setSelectedCourseId(null);
              }}
              style={styles.closeBtn}
            >
              X
            </button>
          </div>

          {acceptedCourses.length === 0 ? (
            <p>Darslar yo‘q.</p>
          ) : (
            <div style={styles.coursesList}>
              {acceptedCourses.map((courseItem, index) => {
                const courseId = courseItem.course_id;
                const course = courseItem.courses;

                return (
                  <div key={courseId} style={styles.courseCard}>
                    <div style={styles.courseTopRow}>
                      <div
                        style={styles.courseTitleRow}
                        onClick={() => toggleCourse(courseId)}
                      >
                        <span style={styles.numberBox}>#{index + 1}</span>
                        <strong>{course?.title || "Noma‘lum kurs"}</strong>
                      </div>
                      <button
                        style={{
                          ...styles.toggleBtn,
                          background:
                            selectedCourseId === courseId
                              ? "rgba(239,68,68,0.2)"
                              : "rgba(34,197,94,0.2)",
                          border:
                            selectedCourseId === courseId
                              ? "1px solid rgba(239,68,68,0.5)"
                              : "1px solid rgba(34,197,94,0.5)",
                        }}
                        onClick={() => toggleCourse(courseId)}
                      >
                        {selectedCourseId === courseId ? "✕" : "+"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showSettings && (
        <div style={styles.settingsModal}>
          <div style={styles.settingsHeader}>
            <button
              onClick={() => setShowSettings(false)}
              style={styles.backBtn}
            >
              ← Orqaga
            </button>
            <h3>Student Sozlamalari</h3>
          </div>
          <div style={styles.settingsContent}>
            <StudentSettings isModal={true} />
          </div>
        </div>
      )}

      {/* Lessons Modal */}
      {selectedCourseId && (
        <div
          style={styles.modalOverlay}
          onClick={() => setSelectedCourseId(null)}
        >
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {(() => {
                  const course = acceptedCourses.find(
                    (c) => c.course_id === selectedCourseId,
                  );
                  return course?.courses?.title || "Darslar";
                })()}
              </h3>
              <button
                onClick={() => setSelectedCourseId(null)}
                style={styles.modalCloseBtn}
              >
                ✕
              </button>
            </div>
            <div style={styles.modalBody} className="modal-scrollbar-hide">
              {loadingLessonsFor === selectedCourseId ? (
                <p style={styles.loadingText}>Yuklanmoqda...</p>
              ) : (
                (() => {
                  const lessons = lessonsByCourse[selectedCourseId] || [];
                  if (lessons.length === 0) {
                    return <p style={styles.emptyText}>Darslar topilmadi.</p>;
                  }
                  return (
                    <ul style={styles.requestsList}>
                      {lessons.map((lesson, idx) => (
                        <li key={lesson.id} style={styles.lessonItem}>
                          <div style={styles.lessonCard}>
                            <div style={styles.lessonHeader}>
                              <div style={styles.lessonNumber}>{idx + 1}</div>
                              <div>
                                <strong style={styles.lessonTitle}>
                                  {lesson.title || "Noma'lum mavzu"}
                                </strong>
                                <p style={styles.lessonDesc}>
                                  {lesson.description || "Tavsif yo'q"}
                                </p>
                              </div>
                            </div>
                            <div style={styles.lessonFiles}>
                              {lesson.video_url && (
                                <a
                                  href={lesson.video_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={styles.fileBtn}
                                >
                                  🎥 Video link
                                </a>
                              )}
                              {Array.isArray(lesson.source_files) &&
                                lesson.source_files.length > 0 &&
                                lesson.source_files.map((source, i) => {
                                  // source: { url, originalName } yoki string
                                  let fileObj = source;
                                  if (typeof source === 'string') {
                                    fileObj = { url: source };
                                  }
                                  if (!fileObj.url) return null;
                                  return (
                                    <button
                                      key={i}
                                      onClick={() => downloadFile(fileObj)}
                                      style={styles.fileBtn}
                                    >
                                      📄 {fileObj.originalName ? fileObj.originalName : `Fayl #${i + 1}`}
                                    </button>
                                  );
                                })}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hide sidebar when settings modal is open */}
      {showSettings && (
        <style>{`
        aside { display: none !important; }
        main { width: 100% !important; margin-left: 0 !important; }
      `}</style>
      )}

      {/* Modal scrollbar hide + fadeIn animation */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .modal-scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .modal-scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    padding: "30px",
    background: "radial-gradient(circle at top, #1e293b, #020617)",
    minHeight: "92vh",
    color: "white",
    fontFamily: "system-ui, sans-serif",
  },

  title: {
    fontSize: "28px",
    fontWeight: "bold",
  },

  grid: {
    display: "flex",
    gap: "20px",
    marginTop: "25px",
  },

  card: {
    background: "rgba(255,255,255,0.08)",
    padding: "20px",
    borderRadius: "16px",
    width: "220px",
    cursor: "pointer",
    transition: "0.3s",
  },

  number: {
    fontSize: "28px",
    fontWeight: "bold",
    marginTop: "10px",
  },

  requestsSection: {
    marginTop: "30px",
    padding: "20px",
    background: "rgba(255,255,255,0.08)",
    borderRadius: "16px",
  },

  requestsList: {
    listStyle: "none",
    padding: 0,
  },

  requestItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
  },

  status: {
    padding: "5px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "bold",
    color: "black",
  },

  date: {
    fontSize: "12px",
    opacity: 0.7,
  },

  pagination: {
    marginTop: "20px",
    display: "flex",
    gap: "10px",
    justifyContent: "center",
  },

  pageBtn: {
    padding: "8px 12px",
    borderRadius: "50%",
    border: "1px solid rgba(255,255,255,0.2)",
    cursor: "pointer",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  closeBtn: {
    background: "rgba(239,68,68,0.15)",
    border: "1px solid rgba(239,68,68,0.4)",
    color: "#f87171",
    padding: "6px 10px",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "0.3s",
  },
  coursesList: {
    display: "grid",
    gap: "12px",
  },
  courseCard: {
    background: "rgba(255,255,255,0.06)",
    borderRadius: "12px",
    padding: "12px",
    border: "1px solid rgba(255,255,255,0.1)",
  },
  courseTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  courseTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    cursor: "pointer",
  },
  toggleBtn: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    color: "white",
    fontSize: "18px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "0.3s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  lessonItem: {
    marginBottom: "10px",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    paddingBottom: "8px",
  },
  lessonFiles: {
    display: "flex",
    gap: "9px",
    flexWrap: "wrap",
    marginTop: "5px",
  },
  fileLink: {
    color: "#7dd3fc",
    textDecoration: "underline",
    fontSize: "12px",
  },

  numberBox: {
    minWidth: "32px",
    height: "32px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    marginRight: "12px",
    color: "black",
  },
  settingsModal: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "linear-gradient(135deg, #0f172a, #1e293b)",
    display: "flex",
    flexDirection: "column",
    zIndex: 1000,
  },
  settingsHeader: {
    display: "flex",
    alignItems: "center",
    padding: "20px",
    background: "rgba(255,255,255,0.1)",
    borderBottom: "1px solid rgba(255,255,255,0.2)",
  },
  backBtn: {
    background: "rgba(255,255,255,0.2)",
    border: "1px solid rgba(255,255,255,0.3)",
    color: "white",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    marginRight: "20px",
  },
  settingsContent: {
    flex: 1,
    padding: "20px",
    overflowY: "auto",
  },
  lessonCard: {
    background: "rgba(255,255,255,0.04)",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.08)",
    transition: "0.3s",
  },

  lessonHeader: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
  },

  lessonNumber: {
    minWidth: "32px",
    height: "32px",
    borderRadius: "8px",
    background: "#22c55e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    color: "black",
  },

  lessonTitle: {
    fontSize: "15px",
  },

  lessonDesc: {
    fontSize: "12px",
    opacity: 0.7,
    marginTop: "2px",
  },

  fileBtn: {
    background: "rgba(125, 211, 252, 0.1)",
    border: "1px solid rgba(125, 211, 252, 0.3)",
    padding: "5px 10px",
    borderRadius: "6px",
    fontSize: "12px",
    color: "#7dd3fc",
    textDecoration: "none",
    transition: "0.2s",
  },

  // Modal styles
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1001,
    animation: "fadeIn 0.2s ease-out",
  },
  modalContent: {
    background: "linear-gradient(135deg, #1e293b, #0f172a)",
    borderRadius: "16px",
    width: "90%",
    maxWidth: "700px",
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  },
  modalTitle: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "white",
    margin: 0,
  },
  modalCloseBtn: {
    background: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.4)",
    color: "#f87171",
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    fontSize: "18px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "0.2s",
  },
  modalBody: {
    flex: 1,
    overflowY: "auto",
    padding: "20px 24px",
  },
  loadingText: {
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    padding: "20px",
  },
  emptyText: {
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    padding: "20px",
  },
};
