import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase";
import { toast } from "react-toastify";

export default function CreateCourse() {
  const [showToast, setShowToast] = useState(false);
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1️⃣ Login bo‘lgan o‘qituvchini olish
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Avval login qiling");
      return;
    }

    // 2️⃣ Kursni Supabase ga yozish
    const { error } = await supabase.from("courses").insert([
      {
        title,
        description,
        video_url: videoUrl,
        teacher_id: user.id,
      },
    ]);

    if (error) {
      console.error(error);
      toast.error("Kurs saqlanmadi");
      return;
    }

    // 3️⃣ UI feedback
    setShowToast(true);
    setTitle("");
    setDescription("");
    setVideoUrl("");

    setTimeout(() => {
      setShowToast(false);
      navigate("/teacher");
    }, 2000);
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="header">
        <button className="back-btn" onClick={() => navigate("/teacher")}>
          <i class="fa-solid fa-arrow-left"></i>
          Orqaga qaytish
        </button>

        <h1 style={{color: "white"}}>📘 Kurs yaratish</h1>
        <p>Kurs nomi, tavsifi va video havolasini kiriting</p>
      </div>

      {/* Form card */}
      <form className="card" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Kurs nomi"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          placeholder="Kurs tavsifi"
          rows="6"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        ></textarea>

        <input
          type="url"
          placeholder="YouTube video URL (ixtiyoriy)"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
        />

        {/* File upload */}
        <label className="file-box">
          📎 PDF / Word / PPTX (ixtiyoriy)
          <input type="file" hidden />
        </label>

        <button type="submit" className="submit-btn">
          ➕ Kursni yaratish
        </button>
      </form>

      {/* Toast */}
      {showToast && (
        <div className="toast">✅ Kurs muvaffaqiyatli yaratildi!</div>
      )}

      {/* CSS */}
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
        }

        .page {
  min-height: 100vh;
  width: 100%;
  background: radial-gradient(circle at top, #0b1220, #020617);

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center; /* 🔥 qo‘shildi */

  padding: 20px; 
}

        .header {
  text-align: center;
  max-width: 600px;
  width: 100%;
  margin-bottom: 20px; 
}

        .back-btn {
          background: rgba(255, 255, 255, 0.08);
          border: none;
          color: white;
          padding: 10px 16px;
          border-radius: 10px;
          cursor: pointer;
          margin-bottom: 20px;
          display: flex;
          gap: 10px;
          border: 2px dashed #3b82f6;
          color: #3b82f6;
          font-size: 16px;
        }

        .header h1 {
          margin: 0;
          font-size: 34px;
        }

        .header p {
          margin-top: 8px;
          color: #94a3b8;
        }

        .card {
  width: 100%;
  max-width: 600px; 
  
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(12px);

  border-radius: 18px;
  padding: 24px; 

  display: flex;
  flex-direction: column;
  gap: 14px; 
  box-shadow: 0 10px 40px rgba(0,0,0,0.4);

}

        input,
        textarea {
          width: 100%;
          padding: 14px 16px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.35);
          color: white;
          font-size: 14px;
          resize: none;
        }

        input::placeholder,
        textarea::placeholder {
          color: #94a3b8;
        }

        input:focus,
        textarea:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .file-box {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          border: 1px dashed #3b82f6;
          background: rgba(59, 130, 246, 0.1);
          text-align: center;
          cursor: pointer;
          color: #bfdbfe;
          font-size: 14px;
        }

        .submit-btn {
          margin-top: 6px;
          padding: 14px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(
            135deg,
            #2563eb,
            #3b82f6
          );
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
        }

        .submit-btn:hover {
          opacity: 0.9;
        }

        .toast {
          position: fixed;
          bottom: 30px;
          right: 50%;
          transform: translateX(50%);
          background: #0f172a;
          border: 1px solid #22c55e;
          color: #dcfce7;
          padding: 14px 20px;
          border-radius: 14px;
          font-size: 15px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        }

        @media (max-width: 640px) {
          .header h1 {
            font-size: 26px;
          }

          .card {
            padding: 22px;
          }
        }
      `}</style>
    </div>
  );
}
