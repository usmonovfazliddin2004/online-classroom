import { Link, Outlet } from "react-router-dom";

export default function StudentLayout() {
  return (
    <div style={styles.page}>
      {/* ===== SIDEBAR ===== */}
      <aside style={styles.sidebar}>
        <h2 style={styles.logo}>🎓 Talaba</h2>

        <ul style={styles.menu}>
          <li>
            <Link to="/student/dashboard" style={styles.link}>
              🏠 Bosh sahifa
            </Link>
          </li>

          <li>
            <Link to="/student" style={styles.link}>
              👨‍🏫 O'qituvchilar
            </Link>
          </li>
          <li>
            <Link to="/student/groups" style={styles.link}>
              👥 Guruhlarim
            </Link>
          </li>
        </ul>
      </aside>

      {/* ===== CONTENT ===== */}
      <main style={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}

/* ===== STYLES ===== */
const styles = {
  page: {
    display: "flex",
    minHeight: "100vh",
    background: "#1e1e2f",
    color: "#fff",
  },
  sidebar: {
    width: "240px",
    background: "#2a2a40",
    padding: "20px",
  },
  logo: {
    marginBottom: "30px",
  },
  menu: {
    listStyle: "none",
    padding: 0,
  },
  link: {
    display: "block",
    padding: "10px",
    color: "#fff",
    textDecoration: "none",
    borderRadius: "8px",
  },
  content: {
    flex: 1,
    padding: "30px",
  },
};