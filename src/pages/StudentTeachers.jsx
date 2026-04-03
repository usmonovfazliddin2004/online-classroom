import { useState, useEffect } from "react";
import { supabase } from "../supabase";

export default function StudentTeachers() {
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [courses, setCourses] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const getCourses = async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          users ( first_name, last_name )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
      } else {
        setCourses(data);
      }
    };

    getCourses();
  }, []);

const sendRequest = async (course) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    setToast({ message: "Login qilinmagan", type: "error" });
    setTimeout(() => setToast(null), 3000);
    return;
  }

  // 🔍 CHECK: mavjud request bormi
  const { data: existingRequest, error: checkError } = await supabase
    .from("course_requests")
    .select("id")
    .eq("course_id", course.id)
    .eq("student_id", user.id);

  if (checkError) {
    console.error(checkError);
    setToast({ message: "Tekshirishda xatolik", type: "error" });
    setTimeout(() => setToast(null), 3000);
    return;
  }

  // ❗ AGAR BOR BO'LSA
  if (existingRequest && existingRequest.length > 0) {
    setToast({
      message: "Siz bu kursga allaqachon so'rov yuborgansiz 📋",
      type: "warning",
    });
    setTimeout(() => setToast(null), 3000);
    return;
  }

  // ✅ Yangi request yuborish
  const { error } = await supabase.from("course_requests").insert([
    {
      course_id: course.id,
      student_id: user.id,
      teacher_id: course.teacher_id,
      status: "pending",
    },
  ]);

  if (error) {
    console.error(error);
    setToast({ message: "Xatolik", type: "error" });
    setTimeout(() => setToast(null), 3000);
  } else {
    setToast({ message: "So'rov yuborildi", type: "success" });
    setTimeout(() => setToast(null), 3000);
  }
};

  return (
    <div>
      {toast && (
        <div style={{
          ...styles.toast,
          background: toast.type === "success" ? "#22c55e" : toast.type === "error" ? "#ef4444" : "#7d6505"
        }}>
          {toast.message}
        </div>
      )}

      <h2>O‘qituvchilar</h2> <br />
      <p>O‘zingiz qiziqqan kursni tanlang</p>

      <div style={styles.grid}>
        {courses.map((course) => (
          <div
            key={course.id}
            style={styles.card}
            onClick={() => setSelectedTeacher(course)}
          >
            <h3>{course.title}</h3>
            <p>
              👨‍🏫 {course.users?.first_name}{" "}
              {course.users?.last_name}
            </p>

            <p style={{ opacity: 0.7 }}>
              {course.description}
            </p>
          </div>
        ))}
      </div>

      {selectedTeacher && (
        <div style={styles.details}>
          <h3>{selectedTeacher.title}</h3>

          <p>
            👨‍🏫 {selectedTeacher.users?.first_name}{" "}
            {selectedTeacher.users?.last_name}
          </p>

          <button
            style={styles.btn}
            onClick={() => sendRequest(selectedTeacher)}
          >
            🚀 Darsga yozilish
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  toast: {
    position: "fixed",
    top: "20px",
    right: "20px",
    padding: "12px 20px",
    borderRadius: "8px",
    color: "white",
    fontWeight: "bold",
    zIndex: 1000,
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: "20px",
    marginTop: "20px",
  },
  card: {
    background: "rgba(255,255,255,0.05)",
    padding: "20px",
    borderRadius: "12px",
    cursor: "pointer",
  },
  details: {
    marginTop: "20px",
    padding: "20px",
    background: "rgba(255,255,255,0.05)",
    borderRadius: "12px",
  },
  btn: {
    marginTop: "10px",
    padding: "10px",
    border: "none",
    borderRadius: "8px",
    background: "#4caf50",
    color: "#fff",
    cursor: "pointer",
  },
};