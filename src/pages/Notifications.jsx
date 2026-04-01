import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";

export default function Notifications() {
  const [requests, setRequests] = useState([]);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // 🔵 Requests load
  const loadRequests = async (teacherId) => {
    const { data, error } = await supabase
      .from("course_requests")
      .select(`
        *,
        courses(title)
      `)
      .eq("teacher_id", teacherId)
      .eq("status", "pending");

    if (!error && data) {
      const withStudents = await Promise.all(
        data.map(async (r) => {
          const { data: student } = await supabase
            .from("users")
            .select("first_name, last_name")
            .eq("id", r.student_id)
            .maybeSingle();

          return { ...r, student };
        })
      );

      setRequests(withStudents);
    }
  };

  useEffect(() => {
    let channel;

    const getUserAndSetup = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setUser(user);
      await loadRequests(user.id);

      channel = supabase
        .channel("requests")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "course_requests",
            filter: `teacher_id=eq.${user.id}`,
          },
          () => {
            loadRequests(user.id);
          }
        )
        .subscribe();
    };

    getUserAndSetup();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const acceptRequest = async (id) => {
    await supabase
      .from("course_requests")
      .update({ status: "accepted" })
      .eq("id", id);

    loadRequests(user.id);
  };

  const rejectRequest = async (id) => {
    await supabase
      .from("course_requests")
      .update({ status: "rejected" })
      .eq("id", id);

    loadRequests(user.id);
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <button style={styles.backBtn} onClick={() => navigate("/teacher")}>
          ← Ortga
        </button>

        <div style={styles.header}>
          🔔 Kursga qabul qilish uchun so‘rovlar !
        </div>

        {requests.length === 0 ? (
          <div style={styles.empty}>Hozircha so‘rovlar yo‘q</div>
        ) : (
          <div style={styles.list}>
            {requests.map((r) => (
              <div style={styles.card} key={r.id}>
                <span style={styles.info}>
                  <b>
                    {r.student?.first_name} {r.student?.last_name}
                  </b>{" "}
                  → {r.courses?.title}
                </span>

                <span style={styles.actions}>
                  <button
                    style={{ ...styles.btn, ...styles.accept }}
                    onClick={() => acceptRequest(r.id)}
                  >
                    ✅ Qabul qilish
                  </button>

                  <button
                    style={{ ...styles.btn, ...styles.reject }}
                    onClick={() => rejectRequest(r.id)}
                  >
                    ❌ Rad etish
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

//////////////////////////////////////////////////
// 🎨 CSS
//////////////////////////////////////////////////

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    fontFamily: "Inter, Arial",
  },

  container: {
    width: "100%",
    maxWidth: "650px",
    background: "#1e293b",
    borderRadius: "20px",
    boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
    padding: "40px 30px 30px",
    position: "relative",
  },

  header: {
    fontSize: "30px",
    fontWeight: "700",
    marginBottom: "30px",
    textAlign: "center",
    color: "#fff",
    marginTop: "60px",
  },

  backBtn: {
    position: "absolute",
    top: "20px",
    left: "20px",
    background: "#334155",
    color: "#60a5fa",
    border: "none",
    borderRadius: "10px",
    padding: "8px 14px",
    cursor: "pointer",
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },

  card: {
    background: "#273449",
    borderRadius: "14px",
    padding: "18px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
  },

  info: {
    fontSize: "16px",
    color: "#e2e8f0",
  },

  actions: {
    display: "flex",
    gap: "10px",
  },

  btn: {
    border: "none",
    borderRadius: "8px",
    padding: "8px 14px",
    cursor: "pointer",
    fontWeight: "600",
  },

  accept: {
    background: "#22c55e",
    color: "#fff",
  },

  reject: {
    background: "#ef4444",
    color: "#fff",
  },

  empty: {
    textAlign: "center",
    marginTop: "20px",
    color: "#94a3b8",
    fontSize: "16px",
  },
};