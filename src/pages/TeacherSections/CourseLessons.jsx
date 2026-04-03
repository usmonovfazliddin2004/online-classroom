import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase";
import toast, { Toaster } from "react-hot-toast";

export default function CreateLesson() {
  const navigate = useNavigate();

  // FORM STATES
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [sourceFiles, setSourceFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  // =============================
  // ADD LESSON
  // =============================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let videoFileUrl = null;
      let sourceUrls = [];

      // 🎥 VIDEO FILE
      if (videoFile) {
        const videoPath = `videos/${Date.now()}-${videoFile.name}`;

        const { error } = await supabase.storage
          .from("lesson-files")
          .upload(videoPath, videoFile);

        if (error) throw error;
        toast.success("Dars muvaffaqiyatli saqlandi!");

        videoFileUrl = supabase.storage
          .from("lesson-files")
          .getPublicUrl(videoPath).data.publicUrl;
      }

      // 📎 SOURCE FILES
      for (let file of sourceFiles) {
        const filePath = `sources/${Date.now()}-${file.name}`;

        const { error } = await supabase.storage
          .from("lesson-files")
          .upload(filePath, file);

        if (error) throw error;

        const fileUrl = supabase.storage
          .from("lesson-files")
          .getPublicUrl(filePath).data.publicUrl;

        sourceUrls.push(fileUrl);
      }

      // 👤 USER
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("User topilmadi");

      // 💾 SAVE LESSON (ID YO‘Q)
      const { error } = await supabase.from("lessons").insert({
        title,
        content,
        video_url: youtubeUrl || null,
        video_file: videoFileUrl,
        source_files: sourceUrls,
        teacher_id: user.id,
      });

      if (error) throw error;

      // 🔄 RESET
      setTitle("");
      setContent("");
      setYoutubeUrl("");
      setVideoFile(null);
      setSourceFiles([]);

      navigate("/teacher"); // yoki navigate(-1)
    } catch (err) {
      console.error("SAQLASH XATOSI:", err);
      toast.error("Dars saqlanmadi!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Toaster position="top-right" reverseOrder={false} />
      <div className="page">
        <div className="header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            ← Orqaga
          </button>
          <h1>Yangi dars qo‘shish</h1>
        </div>

        <form className="card" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Dars sarlavhasi"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <textarea
            placeholder="Dars mazmuni"
            rows="6"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <input
            type="url"
            placeholder="YouTube link (ixtiyoriy)"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
          />

          <label className="file-box">
            🎥 Video yuklash
            <input
              type="file"
              accept="video/*"
              hidden
              onChange={(e) => setVideoFile(e.target.files[0])}
            />
          </label>

          {videoFile && <div className="file-item">🎥 {videoFile.name}</div>}

          <label className="file-box">
            📎 Materiallar yuklash
            <input
              type="file"
              hidden
              multiple
              accept=".pdf,.doc,.docx,.ppt,.pptx"
              onChange={(e) => setSourceFiles([...e.target.files])}
            />
          </label>

          {sourceFiles.map((file, i) => (
            <div key={i} className="file-item">
              📄 {file.name}
            </div>
          ))}

          <button type="submit" disabled={loading}>
            {loading ? "Saqlanmoqda..." : "💾 Saqlash"}
          </button>
        </form>
      </div>

      <style>{`
      .page { 
      min-height: 100vh; 
      background: radial-gradient(circle at top, #020617, #000); 
      padding: 40px 20px; color: #e5e7eb; } 
      /* HEADER */ 
      .header { 
      display: flex; 
      align-items: center; 
      gap: 14px; 
      margin-bottom: 24px; 
      } 
      .header 
      h1 { font-size: 24px; 
      font-weight: 600; 
      } 
      /* BACK BUTTON */ 
      .back-btn { background: rgba(255,255,255,0.06); 
      border: 1px solid rgba(255,255,255,0.12); 
      color: #e5e7eb; 
      padding: 8px 14px; 
      border-radius: 10px; 
      cursor: pointer; 
      transition: all 0.2s ease; 
      } 
      .back-btn:hover 
      { 
      background: rgba(99,102,241,0.15); 
      border-color: #6366f1; 
      } /* CARD */ 
       .card { 
       max-width: 900px; 
       margin: 0 auto; 
       background: linear-gradient(145deg, #020617, #020617); 
       border-radius: 18px; 
       padding: 26px; 
       display: flex; 
       flex-direction: column; 
       gap: 16px; border: 1px solid rgba(255,255,255,0.08); 
       box-shadow: 0 20px 50px rgba(0,0,0,0.6); } /* INPUTS */ 
       .card input, 
       .card textarea 
       { 
       background: #020617; 
       color: #e5e7eb; 
       border-radius: 12px; 
       padding: 12px 14px; 
       border: 1px solid rgba(255,255,255,0.1); 
       font-size: 15px; 
       } 
       .card textarea { 
       resize: vertical; 
       min-height: 120px; 
       max-height: 260px; 
       } 
       .card input 
       { 
       resize: none; 
       } .card 
        input:focus, 
        .card textarea:focus 
        { 
        border-color: #6366f1; 
        outline: none; 
        } /* FILE BOX */ 
         .file-box 
         { 
         padding: 14px 16px;
         border-radius: 12px; 
         background: rgba(255,255,255,0.03); 
         border: 1px dashed rgba(255,255,255,0.18); 
         cursor: pointer; transition: 0.25s; } .file-box:hover { background: rgba(99,102,241,0.08); border-color: #6366f1; } /* SUBMIT BUTTON */ button[type="submit"] { margin-top: 12px; padding: 14px; border-radius: 14px; border: none; background: linear-gradient(135deg, #6366f1, #3b82f6); color: white; font-size: 15px; font-weight: 500; cursor: pointer; } button[type="submit"]:hover { box-shadow: 0 10px 25px rgba(99,102,241,0.35); } /* RESPONSIVE */ @media (max-width: 600px) { .header h1 { font-size: 20px; } .card { padding: 18px; } } // file name and size .file-preview { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #d1d5db; } .file-item { display: flex; gap: 6px; align-items: center; opacity: 0.9; } .file-item span { color: #9ca3af; font-size: 12px; } }
    `}</style>
    </>
  );
}
