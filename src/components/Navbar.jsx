import { Link, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import "../styles/Navbar.css";

function Navbar() {
  const [open, setOpen] = useState(false);

  // 🔐 AUTH (hozircha local state)
  const [isAuth, setIsAuth] = useState(false);

  const navigate = useNavigate();

  // 🚪 LOGOUT
  const handleLogout = () => {
    const confirmLogout = window.confirm(
      "Haqiqatan ham tizimdan chiqmoqchimisiz?"
    );
    if (confirmLogout) {
      setIsAuth(false);
      navigate("/login");
    }
  };

  return (
    <nav className="navbar">
      {/* LOGO */}
      <Link to="/" className="logo" onClick={() => setOpen(false)}>
        Online-Classroom
      </Link>

      {/* LINKS */}
      <div className={`links ${open ? "open" : ""}`}>
        <NavLink to="/" onClick={() => setOpen(false)}>
          Bosh sahifa
        </NavLink>

        {isAuth && (
          <>
            <NavLink to="/classroom" onClick={() => setOpen(false)}>
              Sinfxona
            </NavLink>

            <NavLink to="/profile" onClick={() => setOpen(false)}>
              Profil
            </NavLink>
          </>
        )}
      </div>

      {/* ACTIONS */}
      <div className="actions">
        {!isAuth ? (
          <>
            <NavLink
              to="/login"
              className="login-btn"
              onClick={() => setOpen(false)}
            >
              Kirish
            </NavLink>

            <NavLink
              to="/signUp"
              className="login-btn"
              onClick={() => setOpen(false)}
            >
              Ro'yxatdan o'tish
            </NavLink>
          </>
        ) : (
          <button className="login-btn logout" onClick={handleLogout}>
            Chiqish
          </button>
        )}


        {/* BURGER */}
        <div className="burger" onClick={() => setOpen(!open)}>
          <span />
          <span />
          <span />
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
