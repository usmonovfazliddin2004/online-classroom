import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../supabase";
import { toast } from "react-toastify";

export default function TakeQuiz() {
  const { quizId, assignmentId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        // Get assignment details first
        const { data: assignmentData, error: assignmentError } = await supabase
          .from("quiz_assignments")
          .select("*")
          .eq("id", assignmentId)
          .single();

        if (assignmentError || !assignmentData) {
          toast.error("Topshiriq topilmadi");
          navigate("/student/notifications");
          return;
        }

        if (assignmentData.status === "completed") {
          toast.error("Siz bu testni allaqachon topshirgansiz");
          navigate("/student/notifications");
          return;
        }

        setAssignment(assignmentData);

        console.log("Loading quiz with ID:", assignmentData.quiz_id);

        // Get quiz separately (without relying on foreign key)
        const { data: quizData, error: quizError } = await supabase
          .from("quizzes")
          .select("*")
          .eq("id", assignmentData.quiz_id)
          .single();

        if (quizError || !quizData) {
          toast.error("Test topilmadi");
          navigate("/student/notifications");
          return;
        }

        const quiz = quizData;

        if (!quiz) {
          toast.error("Test topilmadi");
          navigate("/student/notifications");
          return;
        }

        // JSON fix
        if (typeof quiz.questions === "string") {
          quiz.questions = JSON.parse(quiz.questions);
        }

        if (!quiz.questions || quiz.questions.length === 0) {
          toast.error("Savollar topilmadi");
          navigate("/student/notifications");
          return;
        }

        setQuiz(quiz);

        // Set time remaining based on time_limit (in minutes)
        const endTime =
          new Date(assignmentData.started_at || Date.now()).getTime() +
          quiz.time_limit * 60 * 1000;
        const remaining = Math.max(0, endTime - Date.now());
        setTimeRemaining(remaining);

        // Initialize answers
        const initialAnswers = {};
        quiz.questions.forEach((q, index) => {
          initialAnswers[index] = q.type === "multiple" ? "" : "";
        });
        setAnswers(initialAnswers);
      } catch (err) {
        console.error("Error loading quiz:", err);
        toast.error("Testni yuklashda xatolik");
        navigate("/student/notifications");
      } finally {
        setLoading(false);
      }
    };

    loadQuiz();
  }, [assignmentId, navigate]);

  // Timer effect
  useEffect(() => {
    if (!quiz || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1000) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quiz, timeRemaining]);

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleAnswerChange = (questionIndex, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionIndex]: value,
    }));
  };

  const calculateScore = () => {
    if (!quiz) return 0;

    let correct = 0;
    quiz.questions.forEach((question, index) => {
      const userAnswer = answers[index];
      if (question.type === "multiple") {
        if (userAnswer === question.correctAnswer) {
          correct++;
        }
      } else {
        if (
          userAnswer?.trim().toLowerCase() ===
          question.correctAnswer?.trim().toLowerCase()
        ) {
          correct++;
        }
      }
    });

    return Math.round((correct / quiz.questions.length) * 100);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const score = calculateScore();

      // Update assignment with results
      const { error } = await supabase
        .from("quiz_assignments")
        .update({
          status: "completed",
          score,
          answers: answers,
          submitted_at: new Date().toISOString(),
        })
        .eq("id", assignmentId);

      if (error) {
        console.error("Submit error:", error);
        toast.error("Natijani yuborishda xatolik");
        return;
      }

      toast.success("Test muvaffaqiyatli topshirildi!");
      navigate("/student/notifications");
    } catch (err) {
      console.error("Submit error:", err);
      toast.error("Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Test yuklanmoqda...</p>
      </div>
    );
  }

  if (!quiz || !assignment) {
    return (
      <div style={styles.container}>
        <p>Test topilmadi</p>
      </div>
    );
  }

  console.log("quizId:", quizId);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{quiz.title}</h1>
          {quiz.description && (
            <p style={styles.description}>{quiz.description}</p>
          )}
        </div>
        <div style={styles.timer}>
          <span style={styles.timerIcon}>⏱️</span>
          <span
            style={{
              ...styles.timerText,
              color: timeRemaining < 60000 ? "#ef4444" : "#22c55e",
            }}
          >
            {formatTime(timeRemaining)}
          </span>
        </div>
      </div>

      <div style={styles.progress}>
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%`,
            }}
          />
        </div>
        <span style={styles.progressText}>
          {currentQuestion + 1} / {quiz.questions.length}
        </span>
      </div>

      <div style={styles.questionCard}>
        <div style={styles.questionHeader}>
          <span style={styles.questionNumber}>{currentQuestion + 1}-savol</span>
          <span style={styles.questionType}>
            {quiz.questions[currentQuestion].type === "multiple"
              ? "🔘 Ko'p tanlovli"
              : "✍️ Qisqa javob"}
          </span>
        </div>

        <h3 style={styles.questionText}>
          {quiz.questions[currentQuestion].text}
        </h3>

        {quiz.questions[currentQuestion].type === "multiple" ? (
          <div style={styles.options}>
            {quiz.questions[currentQuestion].options.map((option, index) => (
              <button
                key={index}
                style={{
                  ...styles.option,
                  ...(answers[currentQuestion] === `${index}`
                    ? styles.optionSelected
                    : {}),
                }}
                onClick={() => handleAnswerChange(currentQuestion, `${index}`)}
              >
                <span style={styles.optionLetter}>
                  {String.fromCharCode(65 + index)}
                </span>
                {option}
              </button>
            ))}
          </div>
        ) : (
          <input
            type="text"
            style={styles.textInput}
            value={answers[currentQuestion] || ""}
            onChange={(e) =>
              handleAnswerChange(currentQuestion, e.target.value)
            }
            placeholder="Javobni kiriting..."
          />
        )}
      </div>

      <div style={styles.navigation}>
        <button
          style={{
            ...styles.navBtn,
            ...(currentQuestion === 0 ? styles.navBtnDisabled : {}),
          }}
          onClick={() => setCurrentQuestion((prev) => prev - 1)}
          disabled={currentQuestion === 0}
        >
          ← Oldingi
        </button>

        {currentQuestion === quiz.questions.length - 1 ? (
          <button
            style={styles.submitBtn}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Yuborilmoqda..." : "✅ Testni tugatish"}
          </button>
        ) : (
          <button
            style={styles.navBtn}
            onClick={() => setCurrentQuestion((prev) => prev + 1)}
          >
            Keyingi →
          </button>
        )}
      </div>

      <div style={styles.questionNav}>
        {quiz.questions.map((_, index) => (
          <button
            key={index}
            style={{
              ...styles.questionDot,
              ...(index === currentQuestion ? styles.questionDotActive : {}),
              ...(answers[index] ? styles.questionDotAnswered : {}),
            }}
            onClick={() => setCurrentQuestion(index)}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "24px",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "400px",
    gap: "16px",
    color: "rgba(255,255,255,0.6)",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "3px solid rgba(255,255,255,0.1)",
    borderTopColor: "#22c55e",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "24px",
    gap: "16px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#fff",
    marginBottom: "8px",
  },
  description: {
    color: "rgba(255,255,255,0.6)",
    fontSize: "14px",
    lineHeight: "1.5",
  },
  timer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 20px",
    background: "rgba(255,255,255,0.05)",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.1)",
    whiteSpace: "nowrap",
  },
  timerIcon: {
    fontSize: "20px",
  },
  timerText: {
    fontSize: "20px",
    fontWeight: "700",
    fontFamily: "monospace",
    color: "#22c55e",
  },
  progress: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "24px",
  },
  progressBar: {
    flex: 1,
    height: "8px",
    background: "rgba(255,255,255,0.1)",
    borderRadius: "4px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #22c55e, #3b82f6)",
    transition: "width 0.3s ease",
  },
  progressText: {
    fontSize: "14px",
    color: "rgba(255,255,255,0.6)",
    fontWeight: "500",
  },
  questionCard: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "20px",
    padding: "28px",
    marginBottom: "24px",
  },
  questionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  questionNumber: {
    fontSize: "14px",
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
  },
  questionType: {
    fontSize: "12px",
    padding: "6px 12px",
    background: "rgba(59, 130, 246, 0.15)",
    borderRadius: "20px",
    color: "#93c5fd",
  },
  questionText: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#fff",
    lineHeight: "1.6",
    marginBottom: "24px",
  },
  options: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  option: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px 20px",
    background: "rgba(255,255,255,0.03)",
    border: "2px solid rgba(255,255,255,0.1)",
    borderRadius: "14px",
    color: "#fff",
    fontSize: "15px",
    cursor: "pointer",
    transition: "all 0.2s",
    textAlign: "left",
  },
  optionSelected: {
    background: "rgba(34, 197, 94, 0.1)",
    borderColor: "#22c55e",
  },
  optionLetter: {
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.1)",
    borderRadius: "8px",
    fontWeight: "600",
    flexShrink: 0,
  },
  textInput: {
    width: "100%",
    padding: "16px 20px",
    background: "rgba(255,255,255,0.05)",
    border: "2px solid rgba(255,255,255,0.1)",
    borderRadius: "14px",
    color: "#fff",
    fontSize: "16px",
    outline: "none",
    transition: "border-color 0.2s",
  },
  navigation: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    marginBottom: "24px",
  },
  navBtn: {
    flex: 1,
    padding: "14px 24px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    color: "#fff",
    fontSize: "15px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  navBtnDisabled: {
    opacity: 0.3,
    cursor: "not-allowed",
  },
  submitBtn: {
    flex: 1,
    padding: "14px 24px",
    background: "linear-gradient(135deg, #22c55e, #16a34a)",
    border: "none",
    borderRadius: "12px",
    color: "#fff",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
    boxShadow: "0 4px 15px rgba(34, 197, 94, 0.3)",
  },
  questionNav: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    justifyContent: "center",
    padding: "16px",
    background: "rgba(255,255,255,0.02)",
    borderRadius: "16px",
  },
  questionDot: {
    width: "36px",
    height: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    color: "rgba(255,255,255,0.5)",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  questionDotActive: {
    background: "rgba(59, 130, 246, 0.2)",
    borderColor: "#3b82f6",
    color: "#93c5fd",
  },
  questionDotAnswered: {
    background: "rgba(34, 197, 94, 0.2)",
    borderColor: "#22c55e",
    color: "#6ee7b7",
  },
};
