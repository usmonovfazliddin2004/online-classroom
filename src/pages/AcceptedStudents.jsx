import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function AcceptedStudents({ teacherId }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔥 pagination
  const [currentPage, setCurrentPage] = useState(1);
  const studentsPerPage = 7;

  useEffect(() => {
    if (!teacherId) return;

    let channel;

    const loadAccepted = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("course_requests")
        .select(`*, courses(title)`)
        .eq("teacher_id", teacherId)
        .eq("status", "accepted")
        .order("created_at", { ascending: true });

      if (!error) {
        const withStudents = await Promise.all(
          (data || []).map(async (r, index) => {
            const { data: student } = await supabase
              .from("users")
              .select("first_name, last_name")
              .eq("id", r.student_id)
              .maybeSingle();

            return {
              ...r,
              student,
              order: index + 1,
            };
          })
        );

        setStudents(withStudents);
      }

      setLoading(false);
    };

    loadAccepted();

    // 🔥 realtime
    channel = supabase
      .channel("accepted-students")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "course_requests",
          filter: `teacher_id=eq.${teacherId}`,
        },
        () => {
          loadAccepted();
        }
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [teacherId]);

  // 🔥 pagination logic
  const indexOfLast = currentPage * studentsPerPage;
  const indexOfFirst = indexOfLast - studentsPerPage;
  const currentStudents = students.slice(indexOfFirst, indexOfLast);

  const totalPages = Math.ceil(students.length / studentsPerPage);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>✅ Qabul qilinganlar</h2>

      {loading ? (
        <p style={styles.empty}>Yuklanmoqda...</p>
      ) : students.length === 0 ? (
        <p style={styles.empty}>Hozircha yo‘q</p>
      ) : (
        <>
          {/* 🔥 STUDENTS LIST */}
          <div style={styles.list}>
            {currentStudents.map((r) => (
              <div key={r.id} style={styles.card}>
                <div style={styles.left}>
                  <span style={styles.order}>{r.order}.</span>
                  <div>
                    <div style={styles.name}>
                      {r.student?.first_name} {r.student?.last_name}
                    </div>
                    <div style={styles.course}>
                      {r.courses?.title}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 🔥 PAGINATION */}
          <div style={styles.pagination}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
              (page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  style={{
                    ...styles.pageBtn,
                    ...(currentPage === page && styles.activePage),
                  }}
                >
                  {page}
                </button>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}

//////////////////////////////////////////////////
// 🎨 STYLE
//////////////////////////////////////////////////

const styles = {
  container: {
    width: "100%",
    height: "100%",
    padding: "15px",
    background: "#0f172a",
    borderRadius: "20px"
  },

  title: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#22c55e",
    marginBottom: "15px",
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  card: {
    background: "#1e293b",
    padding: "14px 16px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
  },

  left: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  order: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#22c55e",
    minWidth: "25px",
  },

  name: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#e2e8f0",
  },

  course: {
    fontSize: "13px",
    color: "#94a3b8",
  },

  empty: {
    textAlign: "left",
    color: "#64748b",
    marginTop: "20px",
  },

  pagination: {
    marginTop: "20px",
    display: "flex",
    justifyContent: "center",
    gap: "8px",
  },

  pageBtn: {
    padding: "6px 12px",
    borderRadius: "8px",
    border: "1px solid #334155",
    background: "transparent",
    color: "#cbd5f5",
    cursor: "pointer",
  },

  activePage: {
    background: "#22c55e",
    color: "#0f172a",
    fontWeight: "600",
  },
};