import { NavLink, Outlet } from "react-router-dom";

export default function StudentLayout() {
  return (
    <div style={styles.page}>
      {/* ===== SIDEBAR ===== */}
      <aside style={styles.sidebar}>
        <h2 style={styles.logo}>🎓 Talaba</h2>

        <ul style={styles.menu}>
          <li>
            <NavLink
              to="/student/dashboard"
              style={({ isActive }) => ({
                ...styles.link,
                ...(isActive ? styles.activeLink : {}),
              })}
            >
              <i className="fas fa-home"></i>
              Bosh sahifa
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/student"
              end
              style={({ isActive }) => ({
                ...styles.link,
                ...(isActive ? styles.activeLink : {}),
              })}
            >
              <i className="fas fa-chalkboard-teacher"></i>
              O‘qituvchilar
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/student/groups"
              style={({ isActive }) => ({
                ...styles.link,
                ...(isActive ? styles.activeLink : {}),
              })}
            >
              <i className="fas fa-users"></i>
              Guruhlarim
            </NavLink>
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

const styles = {
  page: {
    display: "flex",
    background: "linear-gradient(135deg, #020617, #0f172a)",
    color: "#fff",
    minHeight: "100dvh",
  },

  sidebar: {
    width: "250px",
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(15px)",
    borderRight: "1px solid rgba(255,255,255,0.1)",
    padding: "25px 20px",
    display: "flex",
    flexDirection: "column",
  },

  logo: {
    marginBottom: "40px",
    fontSize: "20px",
    fontWeight: "600",
    letterSpacing: "0.5px",
  },

  menu: {
    listStyle: "none",
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  link: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 14px",
    color: "rgba(255,255,255,0.8)",
    textDecoration: "none",
    borderRadius: "12px",
    transition: "all 0.25s ease",
    fontSize: "14px",
  },

  activeLink: {
    background: "linear-gradient(135deg, #22c55e, #16a34a)",
    color: "#000",
    fontWeight: "600",
    boxShadow: "0 8px 20px rgba(34,197,94,0.4)",
  },

  content: {
    flex: 1,
    padding: "30px",
  },
};
