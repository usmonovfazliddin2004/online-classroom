import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import AcceptedStudents from "./AcceptedStudents";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

export default function TeacherPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState("dashboard");
  const [user, setUser] = useState(null);

  const [showLogout, setShowLogout] = useState(false);
  const [courses, setCourses] = useState([]);

  // EDIT LESSON VALUE
  const [showEditCourse, setShowEditCourse] = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);

  // 🆕 LESSON STATES
  const [showLessons, setShowLessons] = useState(false);
  const [lessons, setLessons] = useState([]);
  const [activeLesson, setActiveLesson] = useState(null);

  // 🆕 ADD LESSON MODAL STATES (QO‘SHIMCHA)
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [currentCourseId, setCurrentCourseId] = useState(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonTopic, setLessonTopic] = useState("");
  const [lessonFile, setLessonFile] = useState(null);
  const [youtubeLink, setYoutubeLink] = useState("");
  const [requests, setRequests] = useState([]);
  const [studentsCount, setStudentsCount] = useState(0);

  const loadRequests = async (teacherId) => {
    const { data, error } = await supabase
      .from("course_requests")
      .select("*")
      .eq("teacher_id", teacherId)
      .eq("status", "pending");

    if (error) {
      return;
    }

    setRequests(data);
  };

  const loadCourses = async (teacherId) => {
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("teacher_id", teacherId);

    if (error) {
      return;
    }

    setCourses(data);
  };

  const loadStudentsCount = async (teacherId) => {
    const { count, error } = await supabase
      .from("course_requests")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", teacherId)
      .eq("status", "accepted");

    if (!error) {
      setStudentsCount(count || 0);
    }
  };

  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        return;
      }

      const currentUser = data?.user;

      if (!currentUser) return;

      setUser(currentUser); // ✅ TO‘G‘RI

      await loadRequests(currentUser.id);
      await loadCourses(currentUser.id);
      await loadStudentsCount(currentUser.id);
    };

    getUser();
  }, []); // ✅ MUHIM

  // ❌ DELETE COURSE
  const deleteCourse = async (courseId) => {
    const ok = window.confirm("Kursni o‘chirmoqchimisiz?");
    if (!ok) return;

    const { error: deleteRequestsError } = await supabase
      .from("course_requests")
      .delete()
      .eq("course_id", courseId);

    if (deleteRequestsError) {
      alert("Course requests o'chirishda xato: " + deleteRequestsError.message);
      return;
    }

    const { error } = await supabase.from("courses").delete().eq("id", courseId);
    if (error) {
      alert("Kursni o'chirishda xato: " + error.message);
      return;
    }
    setCourses(courses.filter((c) => c.id !== courseId));
    alert("✅ Kurs o'chirildi!");
  };

  // 📚 LOAD LESSONS
  const openLessons = async (courseId) => {
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("course_id", courseId)
      .order("created_at", { ascending: true }); // oxiridan tartib

    if (!error) {
      setLessons(data);
      setActiveLesson(null);
      setShowLessons(true);
    }
  };

  // 🗑️ DELETE LESSON
  const deleteLesson = async (lessonId, courseName) => {
    if (!window.confirm(`"${courseName}" darsini o'chirishga ishonchingiz komilmi?`)) {
      return;
    }

    const { error } = await supabase
      .from("lessons")
      .delete()
      .eq("id", lessonId);

    if (error) {
      alert("❌ Darsni o'chirishda xatolik: " + error.message);
      return;
    }

    alert("✅ Dars o'chirildi!");
    
    // Agar o'chirilgan dars active bo'lsa, uni tozalash
    if (activeLesson?.id === lessonId) {
      setActiveLesson(null);
    }
    
    // Lessonlar ro'yxatini yangilash
    setLessons(lessons.filter((l) => l.id !== lessonId));
  };

  const saveLesson = async () => {
    try {
      if (!currentCourseId) {
        alert("Kurs tanlanmagan!");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Foydalanuvchi topilmadi!");
        return;
      }

      let fileUrl = null;

      if (lessonFile) {
        // Fayl nomini tozalash (invalid belgilarni olib tashlash)
        const sanitizedName = lessonFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const { data, error } = await supabase.storage
          .from("lesson-files")
          .upload(`lessons/${Date.now()}-${sanitizedName}`, lessonFile);

        if (error) {
          alert("Fayl yuklashda xato: " + error.message);
          return;
        }

        fileUrl = supabase.storage.from("lesson-files").getPublicUrl(data.path)
          .data.publicUrl;
      }

      const files = fileUrl ? [{ url: fileUrl }] : null;

      const { error: insertError } = await supabase.from("lessons").insert([
        {
          course_id: currentCourseId,
          teacher_id: user.id,
          title: lessonTitle,
          video_url: youtubeLink || null,
          video_file: fileUrl || null,
          source_files: files, // 👈 SHU YER HAM
          content: "",
        },
      ]);

      if (insertError) {
        alert("Database xatosi!");
        return;
      }

      alert("Dars saqlandi!");
      setShowAddLesson(false);
      openLessons(currentCourseId);
    } catch (err) {
      console.error("Kutilmagan xato:", err);
      alert("Server xatosi!");
    }
  };

  const downloadFile = async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch file");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      const rawFilename = url.split("/").pop().split("?")[0];
      const cleanFilename = rawFilename
        .replace(/^\d+-/, "")
        .replace(/[^a-zA-Z0-9._-]/g, "");
      link.download = cleanFilename || "download";
      link.click();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download error:", err);
      alert("Yuklab bo'lmadi");
    }
  };

  // Edit lesson value
  const updateCourse = async () => {
    if (!editCourse) return;

    setSaving(true); // 🔥 boshlanishi

    const { error } = await supabase
      .from("courses")
      .update({
        title: editTitle,
        description: editDesc,
      })
      .eq("id", editCourse.id);

    if (error) {
      alert("Xatolik yuz berdi!");
      setSaving(false); // 🔥 xatoda ham to‘xtaydi
      return;
    }

    // 🔥 local update
    setCourses((prev) =>
      prev.map((c) =>
        c.id === editCourse.id
          ? { ...c, title: editTitle, description: editDesc }
          : c,
      ),
    );

    setSaving(false); // 🔥 tugadi
    setShowEditCourse(false);

    alert("✅ Kurs yangilandi!");
  };

  // Pie chart
  const activityData = [
    { name: "Talabalar", value: studentsCount },
    { name: "Kurslar", value: courses.length },
  ];

  const COLORS = ["#22c55e", "#3b82f6"];

  return (
    <>
      <div className="teacher-wrapper">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <h2>Teacher LMS</h2>

          <nav className="menu">
            <span
              className={active === "dashboard" ? "active" : ""}
              onClick={() => setActive("dashboard")}
            >
              Dashboard
            </span>

            <div className="menu-divider" />

            <span onClick={() => navigate("/teacher/create-course")}>
              Kurs yaratish
            </span>

            <div className="menu-divider" />

            <span onClick={() => navigate("/teacher/profile-settings")}>
              Profil
            </span>

            <div className="menu-divider" />

            <span onClick={() => navigate("/teacher/notifications")}>
              Bildirishnomalar ({requests.length})
            </span>

            <div className="menu-divider" />

            <span>
              <span onClick={() => setActive("accepted")}>
                Qabul qilingan talabalar
              </span>
            </span>

            <div className="menu-divider" />

            <span
              onClick={() => navigate("/teacher/groups")}
            >
              Guruhlar
            </span>
          </nav>

          <button className="logout-btn" onClick={() => setShowLogout(true)}>
            Chiqish
          </button>
        </aside>

        <div className="divider" />

        {/* CONTENT */}
        <main className="content">
          <div style={{ flex: 1 }}>
            {active === "dashboard" && (
              <>
                <h1>📊 O'qituvchi paneli</h1>

                {/* Pie chart */}
                <div className="stats">
                  {/* LEFT */}
                  <div className="stats-left">
                    <div className="stat-card">
                      <strong>{courses.length}</strong>
                      <span>Kurslar</span>
                    </div>

                    <div className="stat-card">
                      <strong>{studentsCount}</strong>
                      <span>Talabalar</span>
                    </div>
                  </div>

                  {/* RIGHT (PIE CHART) */}
                  <div className="chart-box">
                    <ResponsiveContainer
                      width="80%"
                      height={260}
                    >
                    <PieChart>
                      <Pie
                        data={activityData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        label={({ percent }) =>
                          percent ? `${(percent * 100).toFixed(0)}%` : ""
                        }
                      >
                        {activityData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i]} />
                        ))}
                      </Pie>

                      <Tooltip
                        formatter={(value, name) => {
                          const total = studentsCount + courses.length || 1;
                          const percent = ((value / total) * 100).toFixed(1);
                          return [`${value} ta (${percent}%)`, name];
                        }}
                      />
                    </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* </div> */}

                {courses.length === 0 && (
                  <p className="empty">Hozircha kurslar mavjud emas 🚀</p>
                )}

                {courses.length > 0 && (
                  <div className="course-list">
                    {courses.map((course) => (
                      <div className="course-card" key={course.id}>
                        <div>
                          <h3>{course.title}</h3>
                          <p>{course.description}</p>
                        </div>

                        <div className="course-actions">
                          <i
                            className="fa-solid fa-book"
                            title="Dars qo‘shish"
                            onClick={() => {
                              setCurrentCourseId(course.id);
                              setShowAddLesson(true);
                            }}
                          ></i>

                          <i
                            className="fa-solid fa-pen"
                            title="Tahrirlash"
                            onClick={() => {
                              setEditCourse(course);
                              setEditTitle(course.title);
                              setEditDesc(course.description);
                              setShowEditCourse(true);
                            }}
                          ></i>

                          <i
                            className="fa-solid fa-trash"
                            title="O‘chirish"
                            onClick={() => deleteCourse(course.id)}
                          ></i>

                          <i
                            className="fa-solid fa-list"
                            title="Lessonlar"
                            onClick={(e) => {
                              e.stopPropagation();
                              openLessons(course.id);
                            }}
                          ></i>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {active === "accepted" && (
              <div style={{ padding: "20px" }}>
                {!user ? (
                  <p style={{ color: "#aaa" }}>Yuklanmoqda...</p>
                ) : (
                  <AcceptedStudents teacherId={user.id} />
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* LESSON MODAL */}
      {showLessons && (
        <div className="overlay">
          <div className="modal">
            <div style={{ display: "flex", gap: "120px" }}>
              <div>
                <h3
                  style={{
                    color: "#fff",
                    fontSize: "24px",
                    marginBottom: "6px",
                  }}
                >
                  📚 Lessonlar
                </h3>

                {lessons.length === 0 && (
                  <p style={{ color: "#ccc" }}>Lessonlar hali yo‘q</p>
                )}

                {lessons.map((lesson, index) => (
                  <div
                    key={lesson.id}
                    style={{
                      padding: "10px",
                      cursor: "pointer",
                      color: "#fff",
                      borderBottom: "1px solid rgba(255,255,255,0.1)",
                      textAlign: "left",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "20px",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div onClick={() => setActiveLesson(lesson)} style={{ flex: 1 }}>
                      {index + 1}. {lesson.title}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLesson(lesson.id, lesson.title);
                      }}
                      style={{
                        background: "rgba(239, 68, 68, 0.15)",
                        border: "1px solid rgba(239, 68, 68, 0.4)",
                        color: "#f87171",
                        padding: "5px 10px",
                        borderRadius: "5px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "600",
                        transition: "0.2s",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(239, 68, 68, 0.25)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)";
                      }}
                    >
                      🗑️ O'chirish
                    </button>
                  </div>
                ))}
              </div>
              <div>
                {activeLesson && (
                  <div style={{ marginTop: "16px", color: "#fff" }}>
                    <h4>{activeLesson.title}</h4>
                    <p>{activeLesson.content}</p>

                    {activeLesson.video_url && (
                      <div style={{ marginTop: "10px" }}>
                        <p>🎥 YouTube Video:</p>
                        {(() => {
                          const url = activeLesson.video_url;
                          let embedUrl = null;
                          if (url.includes("youtube.com/watch?v=")) {
                            const videoId = url.split("v=")[1].split("&")[0];
                            embedUrl = `https://www.youtube.com/embed/${videoId}`;
                          } else if (url.includes("youtu.be/")) {
                            const videoId = url
                              .split("youtu.be/")[1]
                              .split("?")[0];
                            embedUrl = `https://www.youtube.com/embed/${videoId}`;
                          }
                          return embedUrl ? (
                            <iframe
                              width="600px"
                              height="315"
                              src={embedUrl}
                              title="YouTube video player"
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            ></iframe>
                          ) : (
                            <a
                              href={url}
                              target="_blank"
                              style={{ color: "#60a5fa" }}
                            >
                              Video URL
                            </a>
                          );
                        })()}
                      </div>
                    )}

                    {/* {activeLesson.video_file && (
                  <div style={{ marginTop: "10px" }}>
                    <p>📹 Yuklangan Video:</p>
                    <video
                      src={activeLesson.video_file}
                      controls
                      style={{ width: "100%", maxWidth: "500px" }}
                    />
                  </div>
                )} */}

                    {/* SOURCE FILES */}
                    {activeLesson.source_files &&
                      (() => {
                        let files = [];
                        if (Array.isArray(activeLesson.source_files)) {
                          files = activeLesson.source_files;
                        } else {
                          try {
                            files = JSON.parse(activeLesson.source_files);
                          } catch {
                            files = [];
                          }
                        }

                        if (files.length === 0) return null;

                        return (
                          <div style={{ marginTop: "10px" }}>
                            <p>📎 Materiallar:</p>
                            {files.map((file, i) => (
                              <a
                                key={i}
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  downloadFile(file.url || file);
                                }}
                                style={{
                                  display: "block",
                                  color: "#60a5fa",
                                  marginBottom: "5px",
                                  cursor: "pointer",
                                }}
                              >
                                {(file.url || file).split("/").pop()}
                              </a>
                            ))}
                          </div>
                        );
                      })()}

                    {/* Edit lesson value */}
                  </div>
                )}
              </div>
            </div>
            <button onClick={() => setShowLessons(false)} className="closeBtn">
              Yopish
            </button>
          </div>
        </div>
      )}

      {/* LOGOUT MODAL */}
      {showLogout && (
        <div className="overlay">
          <div className="modal">
            <div className="logout-icon">⚠️</div>
            <h3 className="text">Chiqishni tasdiqlaysizmi?</h3>
            <p className="logout-text">
              Agar chiqib ketsangiz, qayta login qilishingiz kerak bo‘ladi.
            </p>

            <div className="actions">
              <button className="yes" onClick={() => navigate("/login")}>
                <i className="fa-solid fa-right-from-bracket"></i> Ha
              </button>
              <button className="no" onClick={() => setShowLogout(false)}>
                <i className="fa-solid fa-xmark"></i> Yo‘q
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✏️ EDIT COURSE MODAL */}
      {showEditCourse && (
        <div className="overlay">
          <div className="edit-modal">
            <h2 className="edit-title">✏️ Kursni tahrirlash</h2>

            <input
              className="edit-input"
              placeholder="Kurs nomi"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />

            <textarea
              className="edit-textarea"
              placeholder="Kurs tavsifi"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
            />

            <div className="edit-actions">
              <button
                className="save-btn"
                onClick={updateCourse}
                disabled={saving}
              >
                <i className="fa-solid fa-floppy-disk"></i>
                {saving ? " Saqlanmoqda..." : " Saqlash"}
              </button>

              <button
                className="cancel-btn"
                onClick={() => setShowEditCourse(false)}
              >
                <i className="fa-solid fa-xmark"></i>
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddLesson && (
        <div className="overlay">
          <div className="add-lesson-modal">
            <div className="modal-header">
              <div className="modal-title-wrapper">
                <div className="title-icon">➕</div>
                <div>
                  <h3 className="modal-title">Yangi dars qo‘shish</h3>
                  <p className="modal-subtitle">Kurs: {courses.find(c => c.id === currentCourseId)?.title || 'Noma\'lum'}</p>
                </div>
              </div>
              <button 
                className="close-modal-btn"
                onClick={() => setShowAddLesson(false)}
                title="Yopish"
              >
                ✕
              </button>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Mavzu</label>
                <input
                  className="form-input"
                  placeholder="Masalan: React Hooks"
                  value={lessonTopic}
                  onChange={(e) => setLessonTopic(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Dars nomi</label>
                <input
                  className="form-input"
                  placeholder="Masalan: useState"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">YouTube link (ixtiyoriy)</label>
                <input
                  className="form-input"
                  placeholder="https://youtube.com/watch?v=..."
                  value={youtubeLink}
                  onChange={(e) => setYoutubeLink(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Fayl yuklash</label>
                <div className="file-upload-wrapper">
                  <input
                    type="file"
                    accept=".pdf,.pptx,.docx,.xlsx,video/*"
                    className="file-input"
                    id="lessonFileInput"
                    onChange={(e) => setLessonFile(e.target.files[0])}
                  />
                  <label htmlFor="lessonFileInput" className="file-upload-label">
                    <span className="file-icon">📁</span>
                    <span className="file-text">Faylni tanlang</span>
                    <span className="file-hint">PDF, PPTX, DOCX, XLSX yoki video</span>
                  </label>
                  {lessonFile && (
                    <div className="file-preview">
                      <span className="file-name">{lessonFile.name}</span>
                      <span className="file-size">{(lessonFile.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowAddLesson(false)}>
                <span className="btn-icon">❌</span>
                Bekor qilish
              </button>
              <button className="btn-primary" onClick={saveLesson}>
                <span className="btn-icon">💾</span>
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODERN ADD LESSON STYLES */}
      <style jsx>{`
        .add-lesson-modal {
          width: 600px;
          max-width: 95vw;
          background: linear-gradient(145deg, #0f172a, #1e293b);
          padding: 30px;
          border-radius: 20px;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.8);
          border: 1px solid rgba(59, 130, 246, 0.3);
          animation: slideUp 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 25px;
          padding-bottom: 15px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .modal-title-wrapper {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .title-icon {
          font-size: 28px;
          background: linear-gradient(135deg, #3b82f6, #22c55e);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .modal-title {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          color: #fff;
          letter-spacing: 0.5px;
        }

        .modal-subtitle {
          margin: 4px 0 0 0;
          font-size: 14px;
          color: #94a3b8;
          font-weight: 500;
        }

        .close-modal-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 24px;
          cursor: pointer;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .close-modal-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          transform: scale(1.1);
        }

        .form-grid {
          display: grid;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-size: 14px;
          font-weight: 600;
          color: #e2e8f0;
          letter-spacing: 0.2px;
        }

        .form-input {
          width: 100%;
          padding: 14px 16px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
          font-size: 16px;
          outline: none;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .form-input::placeholder {
          color: #94a3b8;
        }

        .form-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
          background: rgba(255, 255, 255, 0.08);
          transform: translateY(-1px);
        }

        .file-upload-wrapper {
          position: relative;
        }

        .file-input {
          display: none;
        }

        .file-upload-label {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 12px;
          border: 2px dashed rgba(59, 130, 246, 0.4);
          background: rgba(59, 130, 246, 0.05);
          color: #93c5fd;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 16px;
        }

        .file-upload-label:hover {
          border-color: #3b82f6;
          background: rgba(59, 130, 246, 0.15);
          color: #7dd3fc;
          transform: translateY(-1px);
        }

        .file-icon {
          font-size: 20px;
        }

        .file-text {
          font-weight: 600;
        }

        .file-hint {
          font-size: 12px;
          color: #64748b;
          font-weight: 400;
          margin-left: auto;
        }

        .file-preview {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 10px;
          padding: 10px 12px;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 8px;
          color: #86efac;
          font-size: 14px;
        }

        .file-name {
          font-weight: 500;
          max-width: 70%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .file-size {
          font-size: 12px;
          color: #a7f3d0;
          background: rgba(34, 197, 94, 0.2);
          padding: 2px 8px;
          border-radius: 6px;
        }

        .modal-actions {
          display: flex;
          gap: 15px;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .btn-secondary, .btn-primary {
          flex: 1;
          padding: 14px 20px;
          border-radius: 12px;
          border: none;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .btn-secondary {
          background: linear-gradient(135deg, #374151, #4b5563);
          color: #e5e7eb;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .btn-secondary:hover {
          background: linear-gradient(135deg, #4b5563, #6b7280);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
        }

        .btn-primary {
          background: linear-gradient(135deg, #3b82f6, #22c55e);
          color: white;
          box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4);
        }

        .btn-primary:hover {
          background: linear-gradient(135deg, #2563eb, #16a34a);
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(59, 130, 246, 0.6);
        }

        .btn-icon {
          font-size: 16px;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 768px) {
          .add-lesson-modal {
            width: 95vw;
            padding: 20px;
          }
          
          .modal-title {
            font-size: 20px;
          }
          
          .form-grid {
            gap: 15px;
          }
          
          .modal-actions {
            flex-direction: column;
          }
          
          .btn-secondary, .btn-primary {
            padding: 16px;
          }
        }
      `}</style>

      {/* CSS */}
      <style>{`
{ box-sizing: border-box; }
body { margin: 0; }

/* ================== LAYOUT ================== */
.teacher-wrapper {
  display: flex;
  min-height: 100vh;
  background: radial-gradient(circle, #020617, #000);
  color: white;
}

.sidebar {
  width: 260px;
  padding: 25px;
  display: flex;
  flex-direction: column;
}

.menu {
  margin-top: 30px;
}

.menu span {
  display: block;
  padding: 14px 0;
  cursor: pointer;
  color: #cbd5f5;
  transition: 0.25s;
}

.menu span:hover {
  color: #fff;
}

.menu span.active {
  color: #3b82f6;
  font-weight: 600;
}

.menu-divider {
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(59,130,246,.6),
    transparent
  );
  margin: 8px 0;
}

.logout-btn {
  margin-top: auto;
  background: #dc2626;
  border: none;
  padding: 12px;
  border-radius: 10px;
  color: white;
  cursor: pointer;
  font-size: 18px;
}

.logout-icon {
  font-size: 36px;
}

.text {
  color: white;
  margin-top: 6px;
}

.logout-text {
  color: white;
  margin-top: 6px;
}

.actions {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 12px;
}

.logout-container {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.yes {
  flex: 1;
  padding: 15px;
  border-radius: 14px;
  border: none;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.25s ease;
}
  .no {
  flex: 1;
  padding: 15px;
  border-radius: 14px;
  border: none;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.25s ease;
  }

.divider {
  width: 3px;
  background: linear-gradient(#3b82f6, #020617);
}

.content {
  flex: 1;
  padding: 40px;
}

.stats strong {
  display: block;
  font-size: 28px;
}

.empty {
  opacity: .6;
  margin-top: 20px;
}

/* ================== COURSES ================== */
.course-list {
  margin-top: 30px;
  display: grid;
  gap: 20px;
}

.course-card {
  background: rgba(255,255,255,.05);
  border: 1px solid gray;
  border-radius: 14px;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.course-card p {
  opacity: .7;
  font-size: 14px;
}

.course-actions {
  display: flex;
  gap: 18px;
  font-size: 20px;
}

.course-actions i {
  cursor: pointer;
  transition: .25s;
}

.course-actions i:hover {
  color: #3b82f6;
}

/* ================== RESPONSIVE ================== */
@media (max-width: 768px) {
  .course-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
  }
}

/* ================== OVERLAY (FIXED: only once) ================== */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

/* ================== GENERAL MODAL ================== */
.modal {
  background: #020617;
  padding: 20px 40px;
  border-radius: 22px;
  text-align: center;
  border: 1px solid white;
}

/* ================== BUTTONS ================== */
.closeBtn {
  border: none;
  padding: 8px 20px;
  border-radius: 10px;
  margin-top: 20px;
  font-size: 20px;
  cursor: pointer;
  color: white;
  background-color: #de3b3bff;
  width: 100%;
  font-weight: 700;
}

.lesson-input {
  width: 100%;
  padding: 10px;
  margin: 8px 0;
  border-radius: 10px;
  border: 1px solid #3b82f6;
  background: #020617;
  color: white;
}

.lesson-file {
  width: 100%;
  color: white;
  margin: 8px 0;
}

.saveBtn {
  width: 100%;
  margin-top: 10px;
  padding: 10px;
  border-radius: 10px;
  border: none;
  background: #3b82f6;
  color: white;
  font-weight: 700;
  cursor: pointer;
  font-size: 18px;
}

/* ================== EDIT MODAL ================== */
.edit-modal {
  width: 600px; /* 🔥 kattalashtirildi */
  max-width: 90%;
  background: linear-gradient(145deg, #020617, #0f172a);
  padding: 35px;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.8);
  border: 1px solid rgba(59,130,246,0.3);
  animation: scaleIn 0.25s ease;
}

.edit-title {
  color: #22c55e;
  text-align: center;
  font-size: 28px; /* 🔥 kattaroq */
  font-weight: 700;
  margin-bottom: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
  .edit-title i {
  font-size: 24px;
}

.edit-input,
.edit-textarea {
  width: 100%;
  padding: 16px; /* 🔥 kattaroq */
  margin-bottom: 16px;
  border-radius: 14px;
  border: 1px solid #1e293b;
  background: #020617;
  color: white;
  font-size: 16px;
  outline: none;
  transition: all 0.25s ease;
}

.edit-input:focus,
.edit-textarea:focus {
  border-color: #22c55e;
  box-shadow: 0 0 10px rgba(34,197,94,0.4);
  transform: scale(1.02);
}

.edit-textarea {
  min-height: 140px;
  resize: none;
}

.edit-actions {
  display: flex;
  gap: 15px;
  margin-top: 20px;
}


.save-btn {
  flex: 1;
  padding: 15px;
  border-radius: 14px;
  border: none;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.25s ease;
}
  .save-btn i {
  font-size: 18px;
}

.save-btn:hover {
  transform: translateY(-2px) scale(1.03);
  box-shadow: 0 10px 25px rgba(34,197,94,0.5);
}

.cancel-btn {
  flex: 1;
  padding: 15px;
  border-radius: 14px;
  border: none;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.25s ease;
}
  .cancel-btn i {
  font-size: 18px;
}

.cancel-btn:hover {
  transform: translateY(-2px) scale(1.03);
  box-shadow: 0 10px 25px rgba(239,68,68,0.5);
}


/* ================== ANIMATION ================== */
@keyframes scaleIn {
  from {
    transform: scale(0.85);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}


/* STATS LAYOUT */
/* STATS CONTAINER */
.stats {
  display: flex;
  gap: 20px;
  margin: 30px 0;
  align-items: center;
}

/* LEFT SIDE (SMALLER WIDTH) */
.stats-left {
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 770px; /* 🔥 KICHRAYDI */
}

/* CARD STYLE */
.stat-card {
  background: linear-gradient(145deg, #020617, #0f172a);
  padding: 30px;
  border-radius: 14px;
  text-align: center;
  border: 1px solid rgba(59,130,246,0.4);
}

.stat-card:hover {
  transform: translateY(-2px);
  background: linear-gradient(145deg, #0f172a, #1e293b);
}

.stat-card strong {
  display: block;
  font-size: 26px;
}

.stat-card span {
  font-size: 14px;
  opacity: 0.7;
}

/* RIGHT SIDE (BIG CHART) */
.chart-box {
  flex: 1;
  height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid rgba(59,130,246,0.4);
  border-radius: 14px;
  padding: 20px;
}

.chart-box * {
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
}


.recharts-wrapper,
.recharts-surface {
  background: transparent !important;
}

      `}</style>
    </>
  );
}
