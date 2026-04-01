import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/signUp.css";
import { supabase } from "../supabase";

import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function SignUp() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    gender: "",
    password: "",
    role: "",
  });

const handleSubmit = async (e) => {
  e.preventDefault();

  if (!form.role) {
    toast.error("Rolni tanlang");
    return;
  }

  try {
    const { error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          first_name: form.firstName,
          last_name: form.lastName,
          phone: form.phone,
          gender: form.gender,
          role: form.role,
        },
      },
    });

    if (error) throw error;

    toast.success("Ro‘yxatdan muvaffaqiyatli o‘tildi!");

    if (form.role === "teacher") {
      navigate("/teacher");
    } else {
      navigate("/student");
    }

  } catch (err) {
    console.error(err);
    toast.error(err.message);
  }
};


  return (
    <div className="auth-wrapper">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Ro'yxatdan o'tish</h2>
        <p>Yangi akkaunt yarating</p>

        <div className="form-grid">
          <input
            placeholder="Ism"
            value={form.firstName}
            onChange={(e) =>
              setForm({ ...form, firstName: e.target.value })
            }
            required
          />

          <input
            placeholder="Familiya"
            value={form.lastName}
            onChange={(e) =>
              setForm({ ...form, lastName: e.target.value })
            }
            required
          />
        </div>

        <div className="form-grid">
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
            required
          />

          <input
            type="password"
            placeholder="Parol"
            value={form.password}
            onChange={(e) =>
              setForm({ ...form, password: e.target.value })
            }
            required
          />
        </div>

        <div className="form-grid">
          <PhoneInput
            country="uz"
            enableSearch
            value={form.phone}
            onChange={(value) =>
              setForm({ ...form, phone: `+${value}` })
            }
            placeholder="Telefon raqami"
            containerClass="phone-container"
            inputClass="phone-input"
            buttonClass="phone-btn"
            dropdownClass="phone-dropdown"
            searchClass="phone-search"
          />

          <select
            value={form.gender}
            onChange={(e) =>
              setForm({ ...form, gender: e.target.value })
            }
          >
            <option value="">Jinsni tanlang</option>
            <option value="male">Erkak</option>
            <option value="female">Ayol</option>
          </select>
        </div>

        <p className="role-title">Rolni tanlang</p>

        <div className="role-select">
          <div
            className={`role ${
              form.role === "student" ? "active" : ""
            }`}
            onClick={() =>
              setForm({ ...form, role: "student" })
            }
          >
            🎓 Talaba
          </div>

          <div
            className={`role ${
              form.role === "teacher" ? "active" : ""
            }`}
            onClick={() =>
              setForm({ ...form, role: "teacher" })
            }
          >
            👨‍🏫 O'qituvchi
          </div>
        </div>

        <button type="submit">Ro'yxatdan o'tish</button>

        <span className="hint">
          Akkountingiz bormi?{" "}
          <Link to="/login">Kirish</Link>
        </span>
      </form>

      <ToastContainer position="top-center" />
    </div>
  );
}








