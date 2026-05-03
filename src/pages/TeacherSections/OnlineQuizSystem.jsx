import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabase";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";

export default function OnlineQuizSystem() {
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [groups, setGroups] = useState(["Barchasi"]);
  // const [mode, setMode] = useState('create'); // 🔥 yangi qo‘shamiz
  const [isCreating, setIsCreating] = useState(true);

  useEffect(() => {
    const fetchStudentsAndGroups = async () => {
      try {
        // Get current user (teacher)
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoadingStudents(false);
          return;
        }

        const teacherId = user.id;

        // 1. Get teacher's courses
        const { data: courses, error: coursesError } = await supabase
          .from("courses")
          .select("id")
          .eq("teacher_id", teacherId);

        if (coursesError) {
          console.error("Error fetching courses:", coursesError);
          setLoadingStudents(false);
          return;
        }

        if (!courses || courses.length === 0) {
          setLoadingStudents(false);
          return;
        }

        const courseIds = courses.map((c) => c.id);

        // 2. Get accepted students from course_requests
        const { data: requests, error: requestsError } = await supabase
          .from("course_requests")
          .select("student_id")
          .in("course_id", courseIds)
          .eq("status", "accepted");

        if (requestsError) {
          console.error("Error fetching requests:", requestsError);
          setLoadingStudents(false);
          return;
        }

        if (!requests || requests.length === 0) {
          setLoadingStudents(false);
          return;
        }

        // Get unique student IDs
        const studentIds = [...new Set(requests.map((r) => r.student_id))];

        // 3. Get user details for students
        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("id, first_name, last_name, email")
          .in("id", studentIds);

        if (usersError) {
          console.error("Error fetching users:", usersError);
          setLoadingStudents(false);
          return;
        }

        // 4. Get teacher's groups
        const { data: groupsData, error: groupsError } = await supabase
          .from("groups")
          .select("id, name")
          .eq("teacher_id", teacherId);

        if (groupsError) {
          console.error("Error fetching groups:", groupsError);
        }

        // 5. Get group memberships
        let groupMemberships = [];
        if (groupsData && groupsData.length > 0) {
          const groupIds = groupsData.map((g) => g.id);
          const { data: membersData, error: membersError } = await supabase
            .from("group_members")
            .select("student_id, group_id")
            .in("student_id", studentIds)
            .in("group_id", groupIds);

          if (!membersError && membersData) {
            groupMemberships = membersData;
          }
        }

        // Format students with group names
        const groupNameMap = {};
        if (groupsData) {
          groupsData.forEach((g) => {
            groupNameMap[g.id] = g.name;
          });
        }

        // Create student to group name mapping
        const studentGroupMap = {};
        groupMemberships.forEach((m) => {
          if (groupNameMap[m.group_id]) {
            studentGroupMap[m.student_id] = groupNameMap[m.group_id];
          }
        });

        // Format students
        const formattedStudents = (users || []).map((user) => ({
          id: user.id,
          name:
            `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
            "Noma'lum",
          email: user.email || "",
          group: studentGroupMap[user.id] || "",
        }));

        setStudents(formattedStudents);

        // Get unique groups
        const uniqueGroups = [
          "Barchasi",
          ...new Set(formattedStudents.map((s) => s.group).filter(Boolean)),
        ];
        setGroups(uniqueGroups);
      } catch (err) {
        console.error("Failed to fetch students:", err);
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudentsAndGroups();
  }, []);

  // const [loadedFromDB, setLoadedFromDB] = useState(false);

  useEffect(() => {
    if (isCreating) return; // 🔥 ENG MUHIM

    const fetchQuizzes = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("quizzes")
        .select("*")
        .eq("teacher_id", user.id);

      if (data && data.length > 0) {
        const latestQuiz = data[data.length - 1];

        setTestTitle(latestQuiz.title);
        setTestDescription(latestQuiz.description);
        setTimeLimit(latestQuiz.time_limit);
        setDeadline(latestQuiz.deadline.slice(0, 16));
        setQuestions(latestQuiz.questions);
      }
    };

    fetchQuizzes();
  }, [isCreating]);

  const [activeMenu, setActiveMenu] = useState("quiz");
  const [testTitle, setTestTitle] = useState("");
  const [testDescription, setTestDescription] = useState("");
  const [timeLimit, setTimeLimit] = useState("");
  const [deadline, setDeadline] = useState("");
  const [questions, setQuestions] = useState([
    {
      id: "q1",
      type: "multiple",
      text: "",
      options: ["", "", "", ""],
      correctAnswer: "",
    },
  ]);
  const [filterGroup, setFilterGroup] = useState("Barchasi");
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [notification, setNotification] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [justCreatedTest, setJustCreatedTest] = useState(false);
  const [selectedQuizForExport, setSelectedQuizForExport] = useState("all");
  const [showExportModal, setShowExportModal] = useState(false);

  // Clear form inputs when test is created
  // Clear form inputs when test is created, but NOT after loading quiz from DB
  useEffect(() => {
    if (justCreatedTest) {
      setTestTitle("");
      setTestDescription("");
      setTimeLimit("");
      setDeadline("");
      setQuestions([
        {
          id: `q${Date.now()}${Math.random()}`,
          type: "multiple",
          text: "",
          options: ["", "", "", ""],
          correctAnswer: "",
        },
      ]);
      setSelectedStudents([]);
      setJustCreatedTest(false);
    }
  }, [justCreatedTest]);

  const [assignments, setAssignments] = useState(() => {
    try {
      const stored = localStorage.getItem("onlineQuizData");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.assignments || [];
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [savedTests, setSavedTests] = useState(() => {
    try {
      const stored = localStorage.getItem("onlineQuizData");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.savedTests || [];
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [lastCredentials, setLastCredentials] = useState(() => {
    try {
      const stored = localStorage.getItem("onlineQuizData");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.lastCredentials || [];
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem(
      "onlineQuizData",
      JSON.stringify({ assignments, savedTests, lastCredentials }),
    );
  }, [assignments, savedTests, lastCredentials]);

  // Fetch real assignments from Supabase
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Get teacher's quizzes first
        const { data: quizzes } = await supabase
          .from("quizzes")
          .select("id")
          .eq("teacher_id", user.id);

        if (!quizzes || quizzes.length === 0) return;

        const quizIds = quizzes.map((q) => q.id);

        // Get assignments for these quizzes
        const { data: dbAssignments, error } = await supabase
          .from("quiz_assignments")
          .select("*")
          .in("quiz_id", quizIds);

        if (error) {
          console.error("Error fetching assignments:", error);
          return;
        }

        if (dbAssignments && dbAssignments.length > 0) {
          // Get student details
          const studentIds = [
            ...new Set(dbAssignments.map((a) => a.student_id)),
          ];
          const { data: users } = await supabase
            .from("users")
            .select("id, first_name, last_name, email")
            .in("id", studentIds);

          const userMap = {};
          if (users) {
            users.forEach((u) => {
              userMap[u.id] = u;
            });
          }

          // Get quiz details for each assignment
          const quizIds = [...new Set(dbAssignments.map((a) => a.quiz_id))];
          const { data: quizzes } = await supabase
            .from("quizzes")
            .select("id, title, deadline")
            .in("id", quizIds);

          const quizMap = {};
          if (quizzes) {
            quizzes.forEach((q) => {
              quizMap[q.id] = q;
            });
          }

          // Format assignments with student names and quiz info
          const formattedAssignments = dbAssignments.map((a) => ({
            assignmentId: a.id,
            testId: a.quiz_id,
            quizTitle: quizMap[a.quiz_id]?.title || "Noma'lum test",
            deadline: quizMap[a.quiz_id]?.deadline || "",
            studentId: a.student_id,
            name: userMap[a.student_id]
              ? `${userMap[a.student_id].first_name || ""} ${userMap[a.student_id].last_name || ""}`.trim()
              : a.student_name || "Noma'lum",
            email: userMap[a.student_id]?.email || a.student_email || "",
            group: a.student_group || "",
            username: userMap[a.student_id]?.email || a.student_email || "",
            password: a.access_code,
            status: a.status === "completed" ? "Bajarildi" : "Bajarilmagan",
            score: a.score || 0,
            assignedAt: a.created_at || new Date().toISOString(),
          }));

          setAssignments(formattedAssignments);
        }
      } catch (err) {
        console.error("Error fetching assignments:", err);
      }
    };

    fetchAssignments();
  }, []);

  const filteredStudents =
    filterGroup === "Barchasi"
      ? students
      : students.filter((student) => student.group === filterGroup);

  const toggleStudent = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  };

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `q${Date.now()}${Math.random()}`,
        type: "multiple",
        text: "",
        options: ["", "", "", ""],
        correctAnswer: "",
      },
    ]);
  };

  const deleteQuestion = (id) => {
    setQuestions((prev) => prev.filter((question) => question.id !== id));
  };

  const updateQuestion = (id, field, value, index = null) => {
    setQuestions((prev) =>
      prev.map((question) => {
        if (question.id !== id) return question;
        if (field === "type") {
          return {
            ...question,
            type: value,
            correctAnswer: "",
            options: value === "multiple" ? ["", "", "", ""] : [],
          };
        }
        if (field === "text") {
          return { ...question, text: value };
        }
        if (field === "correctAnswer") {
          return { ...question, correctAnswer: value };
        }
        if (field === "option") {
          const options = [...question.options];
          options[index] = value;
          const correctAnswer =
            question.correctAnswer === `${index}`
              ? `${index}`
              : question.correctAnswer;
          return { ...question, options, correctAnswer };
        }
        return question;
      }),
    );
  };

  const randomPassword = useCallback(() => {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 6; i += 1) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }, []);

  const validateQuestions = questions.every((question) => {
    if (!question.text.trim()) return false;
    if (question.type === "multiple") {
      const filledOptions = question.options.filter((opt) => opt.trim());
      return filledOptions.length >= 2 && question.correctAnswer !== "";
    }
    return question.correctAnswer.trim();
  });

  const canSave =
    testTitle.trim() &&
    testDescription.trim() &&
    timeLimit &&
    deadline &&
    questions.length > 0 &&
    validateQuestions &&
    selectedStudents.length > 0;

  const saveTest = useCallback(async () => {
    if (!canSave) return;

    try {
      // Get current user (teacher)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Foydalanuvchi topilmadi");
        return;
      }

      const testId = crypto.randomUUID
        ? crypto.randomUUID()
        : `quiz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const selected = students.filter((student) =>
        selectedStudents.includes(student.id),
      );

      // 1. Save quiz to Supabase
      const { error: quizError } = await supabase.from("quizzes").insert([
        {
          id: testId,
          teacher_id: user.id,
          title: testTitle.trim(),
          description: testDescription.trim(),
          time_limit: parseInt(timeLimit),
          deadline: new Date(deadline).toISOString(),
          questions: questions,
        },
      ]);

      if (quizError) {
        console.error("Quiz save error:", quizError);
        toast.error("Testni saqlashda xatolik: " + quizError.message);
        return;
      }

      // 2. Create assignments for each student
      const assignmentsData = selected.map((student) => ({
        quiz_id: testId,
        student_id: student.id,
        student_name: student.name,
        student_email: student.email,
        student_group: student.group || null,
        access_code: randomPassword(),
        status: "pending",
      }));

      const { error: assignmentsError } = await supabase
        .from("quiz_assignments")
        .insert(assignmentsData);

      if (assignmentsError) {
        console.error("Assignments error:", assignmentsError);
        toast.error(
          "Topshiriqlarni yaratishda xatolik: " + assignmentsError.message,
        );
        return;
      }

      // 3. Prepare credentials for display
      const credentials = selected.map((student, index) => ({
        assignmentId: assignmentsData[index].access_code, // Using access_code as ID for display
        testId,
        quizTitle: testTitle.trim(),
        deadline: new Date(deadline).toISOString(),
        studentId: student.id,
        name: student.name,
        email: student.email,
        group: student.group,
        username: student.email,
        password: assignmentsData[index].access_code,
        status: "Bajarilmagan",
        score: 0,
        assignedAt: new Date().toISOString(),
      }));

      // 4. Update local state
      setAssignments((prev) => [...credentials, ...prev]);
      setSavedTests((prev) => [
        {
          testId,
          title: testTitle.trim(),
          description: testDescription.trim(),
          timeLimit,
          deadline,
          questions,
          assignedAt: new Date().toISOString(),
          assignedCount: credentials.length,
        },
        ...prev,
      ]);
      setLastCredentials(credentials);
      setNotification(
        `${credentials.length} ta o'quvchiga test topshirildi. Bildirishnomalar yuborildi.`,
      );
      setSuccessMessage(
        "Onlayn test muvaffaqiyatli yaratildi va tanlangan o'quvchilarga topshirildi.",
      );
      setTimeout(() => setSuccessMessage(""), 5000);

      // Mark that test was just created - this will trigger the useEffect to clear inputs
      setJustCreatedTest(true);
      setIsCreating(true);
      setJustCreatedTest(true);
      toast.success("Test muvaffaqiyatli yaratildi!");
    } catch (err) {
      console.error("Save test error:", err);
      toast.error("Xatolik yuz berdi: " + err.message);
    }
  }, [
    canSave,
    selectedStudents,
    students,
    testTitle,
    testDescription,
    timeLimit,
    deadline,
    questions,
    randomPassword,
  ]);

  const simulateSubmission = async (assignmentId) => {
    // Find the assignment to get quiz_id
    const assignment = assignments.find((a) => a.assignmentId === assignmentId);
    if (!assignment) return;

    // Get quiz questions for scoring
    const { data: quiz } = await supabase
      .from("quizzes")
      .select("questions")
      .eq("id", assignment.testId)
      .single();

    const quizQuestions = quiz?.questions || [];
    const total = quizQuestions.length || 1;
    let correct = 0;
    quizQuestions.forEach((question) => {
      const chance = Math.random();
      if (question.type === "multiple") {
        if (chance > 0.4) correct += 1;
      } else {
        if (chance > 0.45) correct += 1;
      }
    });
    const score = Math.round((correct / total) * 100);

    // Update in Supabase
    const { error } = await supabase
      .from("quiz_assignments")
      .update({
        status: "completed",
        score,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", assignmentId);

    if (error) {
      console.error("Error updating assignment:", error);
      toast.error("Xatolik yuz berdi");
      return;
    }

    // Update local state
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.assignmentId !== assignmentId) return a;
        return {
          ...a,
          score,
          status: "Bajarildi",
          submittedAt: new Date().toISOString(),
        };
      }),
    );

    toast.success("Natijalar yangilandi!");
  };

  const exportResults = (quizId = null) => {
    // Filter assignments based on selected quiz
    const filteredAssignments =
      quizId && quizId !== "all"
        ? assignments.filter((a) => a.testId === quizId)
        : assignments;

    // Get quiz title for filename
    let fileName = "quiz-natijalari";
    if (quizId && quizId !== "all") {
      const selectedQuiz = filteredAssignments[0];
      if (selectedQuiz && selectedQuiz.quizTitle) {
        fileName = `${selectedQuiz.quizTitle}-natijalari`;
      }
    }

    // Create worksheet data
    const worksheetData = [
      [
        "Test Nomi",
        "Muddat",
        "O'quvchi ismi",
        "Email",
        "Guruh",
        "Ball",
        "Holat",
        "Topshirilgan sana",
      ],
      ...filteredAssignments.map((assignment) => [
        assignment.quizTitle,
        assignment.deadline
          ? new Date(assignment.deadline).toLocaleDateString("uz-UZ")
          : "-",
        assignment.name,
        assignment.email,
        assignment.group,
        `${assignment.score}%`,
        assignment.status,
        new Date(assignment.assignedAt).toLocaleString(),
      ]),
    ];

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Natijalar");

    // Generate and download Excel file
    XLSX.writeFile(workbook, `${fileName}-${Date.now()}.xlsx`);
    setShowExportModal(false);
  };

  const handleDeleteTest = (testId) => {
    toast.info(
      ({ closeToast }) => (
        <div style={{ color: "white" }}>
          <p style={{ marginBottom: "12px", fontWeight: "500" }}>
            Testni o‘chirmoqchimisiz?
          </p>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "8px",
                border: "none",
                background: "#ef4444",
                color: "white",
                cursor: "pointer",
                width: "150px",
              }}
              onClick={async () => {
                closeToast();

                try {
                  const { error: e1 } = await supabase
                    .from("quiz_assignments")
                    .delete()
                    .eq("quiz_id", testId);

                  if (e1) throw e1;

                  const { error: e2 } = await supabase
                    .from("quizzes")
                    .delete()
                    .eq("id", testId);

                  if (e2) throw e2;

                  setAssignments((prev) =>
                    prev.filter((a) => a.testId !== testId),
                  );

                  toast.success("Test o‘chirildi ✅");
                } catch (err) {
                  toast.error("Xatolik: " + err.message);
                }
              }}
            >
              🗑️ Ha, o‘chirish
            </button>

            <button
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "transparent",
                color: "white",
                cursor: "pointer",
              }}
              onClick={closeToast}
            >
              Bekor qilish
            </button>
          </div>
        </div>
      ),
      {
        autoClose: false,
        closeOnClick: false,
        draggable: false,
      },
    );
  };

  return (
    <div className="quiz-dashboard">
      <style>{`
        /* ===== LAYOUT FIX - Scroll & Height ===== */
        html, body, #root {
          height: 100%;
          overflow: auto;
        }

        /* ===== Import Fonts ===== */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        /* ===== Reset ===== */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        /* ===== Main Dashboard Layout ===== */
        .quiz-dashboard {
          display: flex;
          min-height: 100vh;
          overflow: visible;
          background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #ffffff;
        }

        /* ===== Sidebar ===== */
        .quiz-sidebar {
          width: 280px;
          min-width: 280px;
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          padding: 32px 20px;
          display: flex;
          flex-direction: column;
          gap: 32px;
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          overflow: hidden;
          flex-shrink: 0;
          z-index: 100;
        }

        .quiz-logo {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 0 8px;
          flex-shrink: 0;
        }

        .quiz-logo-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
        }

        .quiz-logo-text {
          font-size: 1.3rem;
          font-weight: 700;
          background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.02em;
        }

        .quiz-menu {
          display: flex;
          flex-direction: column;
          gap: 8px;
          overflow-y: auto;
          flex: 1;
        }

        .quiz-menu-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 1px solid transparent;
          font-size: 0.95rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.7);
          background: transparent;
          width: 100%;
          text-align: left;
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        }

        .quiz-menu-item::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          width: 3px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          transform: scaleY(0);
          transition: transform 0.3s ease;
        }

        .quiz-menu-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.1);
        }

        .quiz-menu-item.active {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
          color: #ffffff;
          border-color: rgba(102, 126, 234, 0.3);
          box-shadow: 0 4px 20px rgba(102, 126, 234, 0.15);
        }

        .quiz-menu-item.active::before {
          transform: scaleY(1);
        }

        .quiz-menu-icon {
          font-size: 1.2rem;
          width: 24px;
          text-align: center;
        }

        /* ===== Main Content ===== */
        .quiz-main {
          flex: 1;
          padding: 32px;
          // margin-left: 280px; /* sidebar width */
          width: calc(100% - 280px); /* 🔥 MUHIM */
          overflow-y: auto;
          height: 100vh;
}

        /* ===== Header ===== */
        .quiz-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
        }

        .quiz-header-content h1 {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 8px;
          background: linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.02em;
        }

        .quiz-header-content p {
          color: rgba(255, 255, 255, 0.6);
          font-size: 1rem;
          max-width: 600px;
          line-height: 1.6;
        }

        .quiz-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
          border: 1px solid rgba(102, 126, 234, 0.3);
          border-radius: 50px;
          font-size: 0.85rem;
          font-weight: 600;
          color: #a5b4fc;
          backdrop-filter: blur(10px);
        }

        /* ===== Cards Grid ===== */
        .quiz-grid {
          display: grid;
          grid-template-columns: 1.3fr 0.7fr;
          gap: 24px;
        }

        /* ===== Card ===== */
        .quiz-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          margin-bottom: 24px;
        }

        .quiz-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
        }

        .quiz-card:hover {
          border-color: rgba(102, 126, 234, 0.2);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
          transform: translateY(-2px);
        }

        .quiz-card-full {
          grid-column: 1 / -1;
        }

        /* ===== Card Header ===== */
        .quiz-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .quiz-card-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .quiz-card-title-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
        }

        .quiz-card-title h2 {
          font-size: 1.15rem;
          font-weight: 600;
          color: #ffffff;
        }

        .quiz-card-subtitle {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 2px;
        }

        /* ===== Form Fields ===== */
        .quiz-form-group {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .quiz-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .quiz-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .quiz-field label {
          font-size: 0.85rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.7);
          letter-spacing: 0.02em;
        }

        .quiz-input,
        .quiz-textarea,
        .quiz-select {
          width: 100%;
          padding: 14px 18px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          color: #ffffff;
          font-size: 0.95rem;
          font-family: inherit;
          outline: none;
          transition: all 0.3s ease;
        }

        .quiz-input::placeholder,
        .quiz-textarea::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .quiz-input:focus,
        .quiz-textarea:focus,
        .quiz-select:focus {
          border-color: rgba(102, 126, 234, 0.5);
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
          background: rgba(255, 255, 255, 0.07);
        }

        .quiz-textarea {
          min-height: 120px;
          max-height: 200px;
          resize: vertical;
          line-height: 1.6;
        }

        .quiz-select {
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 16px center;
          padding-right: 48px;
        }

        .quiz-select option {
          background: #302b63;
          color: #ffffff;
        }

        /* ===== Buttons ===== */
        .quiz-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 28px;
          border: none;
          border-radius: 16px;
          font-size: 0.95rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          height: fit-content;
        }

        .quiz-btn::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          transition: width 0.6s ease, height 0.6s ease;
        }

        .quiz-btn:active::after {
          width: 300px;
          height: 300px;
        }

        
        .quiz-btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #ffffff;
          box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
        }

        .quiz-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(102, 126, 234, 0.4);
        }

        .quiz-btn-secondary {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .quiz-btn-secondary:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
          color: #ffffff;
        }

        .quiz-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .quiz-btn-sm {
          padding: 8px 14px;
          font-size: 0.8rem;
          border-radius: 10px;
          white-space: nowrap;
        }

        .quiz-btn-danger {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .quiz-btn-danger:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.3);
          box-shadow: 0 4px 20px rgba(239, 68, 68, 0.2);
        }

        /* ===== Question Card ===== */
        .quiz-question-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 20px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          transition: all 0.3s ease;
        }

        .quiz-question-card:hover {
          border-color: rgba(102, 126, 234, 0.15);
          background: rgba(255, 255, 255, 0.03);
        }

        .quiz-question-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .quiz-question-number {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .quiz-question-number h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #ffffff;
        }

        .quiz-type-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
          border-radius: 50px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #a5b4fc;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* ===== Student List ===== */
        .quiz-student-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 400px;
          overflow-y: auto;
        }

        .quiz-student-list::-webkit-scrollbar {
          width: 6px;
        }

        .quiz-student-list::-webkit-scrollbar-track {
          background: transparent;
        }

        .quiz-student-list::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }

        .quiz-student-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px 20px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 18px;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .quiz-student-item:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(102, 126, 234, 0.2);
        }

        .quiz-student-item.selected {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
          border-color: rgba(102, 126, 234, 0.3);
        }

        .quiz-student-checkbox {
          width: 22px;
          height: 22px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          flex-shrink: 0;
        }

        .quiz-student-item.selected .quiz-student-checkbox {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-color: transparent;
        }

        .quiz-student-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .quiz-student-name {
          font-weight: 600;
          font-size: 0.95rem;
          color: #ffffff;
        }

        .quiz-student-email {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .quiz-group-badge {
          padding: 6px 14px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 50px;
          font-size: 0.8rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.6);
        }

        /* ===== Rules List ===== */
        .quiz-rules-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .quiz-rule-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 14px 18px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 14px;
          border-left: 3px solid rgba(102, 126, 234, 0.4);
        }

        .quiz-rule-icon {
          font-size: 1.2rem;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .quiz-rule-text {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.5;
        }

        /* ===== Notification ===== */
        .quiz-notification {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 16px;
          color: #93c5fd;
          font-size: 0.9rem;
        }

        .quiz-success-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 18px 24px;
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%);
          border: 1px solid rgba(34, 197, 94, 0.2);
          border-radius: 18px;
          color: #6ee7b7;
          font-size: 0.9rem;
          flex-wrap: wrap;
        }

        /* ===== Credentials Grid ===== */
        .quiz-credentials-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .quiz-credential-item {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .quiz-credential-name {
          font-weight: 600;
          font-size: 1rem;
          color: #ffffff;
        }

        .quiz-credential-detail {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .quiz-credential-label {
          color: rgba(255, 255, 255, 0.4);
          font-weight: 500;
        }

        .quiz-credential-value {
          color: #a5b4fc;
          font-weight: 600;
          font-family: 'Courier New', monospace;
        }

        /* ===== Table ===== */
        .quiz-table-wrapper {
          overflow-x: auto;
          border-radius: 16px;
        }

        .quiz-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 700px;
        }

        .quiz-table tr {
          height: 70px;
        }

        .quiz-table th {
          text-align: left;
          padding: 16px 20px;
          font-size: 0.8rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.02);
        }

        .quiz-table th:first-child {
          border-radius: 16px 0 0 0;
        }

        .quiz-table th:last-child {
          border-radius: 0 16px 0 0;
        }

        .quiz-table td {
          padding: 16px 20px;
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.8);
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          vertical-align: middle;
        }

        .quiz-table tr:last-child td {
          border-bottom: none;
        }

        .quiz-table tr:hover td {
          background: rgba(255, 255, 255, 0.02);
        }

        .quiz-table td:last-child {
          display: flex;
          gap: 8px;
          align-items: center;
          justify-content: center;
          flex-wrap: nowrap;
          height: 82px;

        }

        /* ===== Status Badges ===== */
        .quiz-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 50px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .quiz-status-badge.completed {
          background: rgba(34, 197, 94, 0.15);
          color: #6ee7b7;
        }

        .quiz-status-badge.not-attempted {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
        }

        /* ===== Score Display ===== */
        .quiz-score {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 14px;
          font-size: 1rem;
          font-weight: 700;
          font-family: 'Courier New', monospace;
        }

        .quiz-score.high {
          background: rgba(34, 197, 94, 0.15);
          color: #6ee7b7;
        }

        .quiz-score.medium {
          background: rgba(251, 191, 36, 0.15);
          color: #fbbf24;
        }

        .quiz-score.low {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
        }

        .quiz-score.zero {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.4);
        }

        /* ===== Empty State ===== */
        .quiz-empty {
          text-align: center;
          padding: 48px 24px;
          color: rgba(255, 255, 255, 0.3);
        }

        .quiz-empty-icon {
          font-size: 3rem;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .quiz-empty-text {
          font-size: 1rem;
        }

        /* ===== Action Buttons Row ===== */
        .quiz-actions {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          align-items: center;
        }

        .quiz-selected-count {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.5);
          margin-left: auto;
        }

        /* ===== Loading State ===== */
        .quiz-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.95rem;
          gap: 12px;
        }

        .quiz-loading-spinner {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ===== Scrollbar ===== */
        .quiz-main::-webkit-scrollbar {
          width: 8px;
        }

        .quiz-main::-webkit-scrollbar-track {
          background: transparent;
        }

        .quiz-main::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }

        .quiz-main::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        /* ===== Responsive ===== */
        @media (max-width: 1200px) {
          .quiz-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 900px) {
          .quiz-dashboard {
            flex-direction: column;
          }

          .quiz-sidebar {
            width: 280px;
            min-width: 280px;
            position: sticky; /* 🔥 fixed emas */
            top: 0;
            height: 100vh;
          }

          .quiz-main {
            margin-left: 0;
            padding: 24px 20px;
          }

          .quiz-menu {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 8px;
          }

          .quiz-menu-item {
            flex: 1;
            min-width: fit-content;
            justify-content: center;
          }

          .quiz-form-row {
            grid-template-columns: 1fr;
          }

          .quiz-header {
            flex-direction: column;
            gap: 16px;
          }

          .quiz-header-content h1 {
            font-size: 1.6rem;
          }

          .quiz-credentials-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .quiz-card {
            padding: 20px;
          }

          .quiz-question-card {
            padding: 18px;
          }

          .quiz-btn {
            width: 100%;
          }

          .quiz-actions {
            flex-direction: column;
            width: 100%;
          }

          .quiz-success-banner {
            flex-direction: column;
            text-align: center;
          }
        }

        /* ===== Animations ===== */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .quiz-card {
          animation: fadeInUp 0.5s ease forwards;
        }

        .quiz-card:nth-child(2) { animation-delay: 0.1s; }
        .quiz-card:nth-child(3) { animation-delay: 0.2s; }
        .quiz-card:nth-child(4) { animation-delay: 0.3s; }

        /* ===== Floating particles background effect ===== */
        .quiz-dashboard::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: 
            radial-gradient(circle at 20% 80%, rgba(102, 126, 234, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(118, 75, 162, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(99, 102, 241, 0.05) 0%, transparent 50%);
          pointer-events: none;
          z-index: 0;
        }

        .quiz-dashboard > * {
          position: relative;
          z-index: 1;
        }

        /* ===== Modal Styles ===== */
        .quiz-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .quiz-modal {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 28px;
          width: 90%;
          max-width: 450px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .quiz-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .quiz-modal-header h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #ffffff;
        }

        .quiz-modal-close {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: rgba(255, 255, 255, 0.6);
          width: 32px;
          height: 32px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.2s ease;
        }

        .quiz-modal-close:hover {
          background: rgba(255, 255, 255, 0.2);
          color: #ffffff;
        }

        .quiz-modal-body {
          margin-bottom: 24px;
        }

        .quiz-modal-footer {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
        
        .quiz-modal-footer .quiz-btn {
          width: 200px;
        }
      `}</style>

      {/* Sidebar */}
      <aside className="quiz-sidebar">
        <div className="quiz-logo">
          <div className="quiz-logo-icon">📝</div>
          <span className="quiz-logo-text">LMS O'qituvchi</span>
        </div>

        <nav className="quiz-menu">
          <button
            className={`quiz-menu-item ${activeMenu === "quiz" ? "active" : ""}`}
            onClick={() => setActiveMenu("quiz")}
          >
            <span className="quiz-menu-icon">🎯</span>
            Test/Yakuniy imtihon yaratish
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="quiz-main">
        {/* Header */}
        <header className="quiz-header">
          <div className="quiz-header-content">
            <h1>Onlayn Test / Viktorina Yaratuvchi</h1>
            <p>
              Imtihonlar tuzing, o'quvchilarga topshiring, bildirishnomalar
              yuboring va natijalarni bir joyda ko'rib chiqing.
            </p>
          </div>
          <div className="quiz-badge">👨‍🏫 O'qituvchi Paneli</div>
        </header>

        {/* Test Details & Rules */}
        <div className="quiz-grid">
          {/* Test Details Card */}
          <section className="quiz-card">
            <div className="quiz-card-header">
              <div className="quiz-card-title">
                <div className="quiz-card-title-icon">📋</div>
                <div>
                  <h2>Test Ma'lumotlari</h2>
                  <p className="quiz-card-subtitle">
                    Asosiy imtihon sozlamalari
                  </p>
                </div>
              </div>
            </div>

            <div className="quiz-form-group">
              <div className="quiz-field">
                <label>Nomlanishi</label>
                <input
                  className="quiz-input"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  placeholder="Test nomini kiriting"
                />
              </div>

              <div className="quiz-field">
                <label>Tavsif</label>
                <textarea
                  className="quiz-textarea"
                  value={testDescription}
                  onChange={(e) => setTestDescription(e.target.value)}
                  placeholder="Test haqida qisqacha ma'lumot kiriting..."
                />
              </div>

              <div className="quiz-form-row">
                <div className="quiz-field">
                  <label>Vaqt Cheklovi (daqiqa)</label>
                  <input
                    className="quiz-input"
                    type="number"
                    min="1"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(e.target.value)}
                    placeholder="Masalan: 45"
                  />
                </div>

                <div className="quiz-field">
                  <label>Muddat</label>
                  <input
                    className="quiz-input"
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Rules Card */}
          <section className="quiz-card">
            <div className="quiz-card-header">
              <div className="quiz-card-title">
                <div className="quiz-card-title-icon">📜</div>
                <div>
                  <h2>Imtihon Qoidalari</h2>
                  <p className="quiz-card-subtitle">Kirish va baholash</p>
                </div>
              </div>
            </div>

            <div className="quiz-rules-list">
              <div className="quiz-rule-item">
                <span className="quiz-rule-icon">⏰</span>
                <span className="quiz-rule-text">
                  O'quvchilar imtihonga faqat muddat tugaguncha kirishlari
                  mumkin.
                </span>
              </div>
              <div className="quiz-rule-item">
                <span className="quiz-rule-icon">⏱️</span>
                <span className="quiz-rule-text">
                  Vaqt cheklovi imtihon sessiyasi davomiyligini belgilaydi.
                </span>
              </div>
              <div className="quiz-rule-item">
                <span className="quiz-rule-icon">❌</span>
                <span className="quiz-rule-text">
                  Ishtirok etmaslik avtomatik ravishda 0 ball berilishiga olib
                  keladi.
                </span>
              </div>
              <div className="quiz-rule-item">
                <span className="quiz-rule-icon">✅</span>
                <span className="quiz-rule-text">
                  Avtomatik baholash topshirilgandan so'ng darhol ballni
                  hisoblaydi.
                </span>
              </div>
              <div className="quiz-rule-item">
                <span className="quiz-rule-icon">🔐</span>
                <span className="quiz-rule-text">
                  Har bir o'quvchi uchun kirish ma'lumotlari avtomatik
                  yaratiladi.
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Questions Section */}
        <section className="quiz-card quiz-card-full">
          <div className="quiz-card-header">
            <div className="quiz-card-title">
              <div className="quiz-card-title-icon">❓</div>
              <div>
                <h2>Savollar</h2>
                <p className="quiz-card-subtitle">
                  {questions.length} ta savol qo'shildi
                </p>
              </div>
            </div>
            <button
              className="quiz-btn quiz-btn-secondary quiz-btn-sm"
              onClick={addQuestion}
            >
              ➕ Savol Qo'shish
            </button>
          </div>

          <div className="quiz-form-group">
            {questions.map((question, index) => (
              <div key={question.id} className="quiz-question-card">
                <div className="quiz-question-header">
                  <div className="quiz-question-number">
                    <h3>{index + 1}-savol</h3>
                    <span className="quiz-type-badge">
                      {question.type === "multiple"
                        ? "🔘 Tanlov"
                        : "✍️ Qisqa javob"}
                    </span>
                  </div>
                  <button
                    className="quiz-btn quiz-btn-danger quiz-btn-sm"
                    onClick={() => deleteQuestion(question.id)}
                    disabled={questions.length === 1}
                  >
                    🗑️ O'chirish
                  </button>
                </div>

                <div className="quiz-form-row">
                  <div className="quiz-field">
                    <label>Savol matni</label>
                    <input
                      className="quiz-input"
                      value={question.text}
                      onChange={(e) =>
                        updateQuestion(question.id, "text", e.target.value)
                      }
                      placeholder="Savolni shu yerga yozing..."
                    />
                  </div>

                  <div className="quiz-field">
                    <label>Savol turi</label>
                    <select
                      className="quiz-select"
                      value={question.type}
                      onChange={(e) =>
                        updateQuestion(question.id, "type", e.target.value)
                      }
                    >
                      <option value="multiple">Ko'p tanlovli</option>
                      <option value="closed">Qisqa javob (yopiq savol)</option>
                    </select>
                  </div>
                </div>

                {question.type === "multiple" ? (
                  <>
                    <div className="quiz-form-group">
                      {question.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="quiz-field">
                          <label>{optionIndex + 1}-variant</label>
                          <input
                            className="quiz-input"
                            value={option}
                            onChange={(e) =>
                              updateQuestion(
                                question.id,
                                "option",
                                e.target.value,
                                optionIndex,
                              )
                            }
                            placeholder={`${optionIndex + 1}-javob varianti`}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="quiz-field">
                      <label>To'g'ri javob</label>
                      <select
                        className="quiz-select"
                        value={question.correctAnswer}
                        onChange={(e) =>
                          updateQuestion(
                            question.id,
                            "correctAnswer",
                            e.target.value,
                          )
                        }
                      >
                        <option value="">To'g'ri variantni tanlang</option>
                        {question.options.map((option, optionIndex) => (
                          <option
                            key={optionIndex}
                            value={`${optionIndex}`}
                            disabled={!option.trim()}
                          >
                            {option.trim() || `${optionIndex + 1}-variant`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <div className="quiz-field">
                    <label>To'g'ri javob</label>
                    <input
                      className="quiz-input"
                      value={question.correctAnswer}
                      onChange={(e) =>
                        updateQuestion(
                          question.id,
                          "correctAnswer",
                          e.target.value,
                        )
                      }
                      placeholder="Aniq javobni kiriting"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Student Selection */}
        <section className="quiz-card quiz-card-full">
          <div className="quiz-card-header">
            <div className="quiz-card-title">
              <div className="quiz-card-title-icon">👥</div>
              <div>
                <h2>O'quvchilarni Tanlash</h2>
                <p className="quiz-card-subtitle">
                  {selectedStudents.length} ta o'quvchi tanlangan
                </p>
              </div>
            </div>
            <div className="quiz-field" style={{ width: "220px" }}>
              <label>Guruh bo'yicha filtrlash</label>
              <select
                className="quiz-select"
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
              >
                {groups.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadingStudents ? (
            <div className="quiz-loading">
              <div className="quiz-loading-spinner"></div>
              <span>O'quvchilar yuklanmoqda...</span>
            </div>
          ) : (
            <div className="quiz-student-list">
              {filteredStudents.length === 0 ? (
                <div className="quiz-empty">
                  <div className="quiz-empty-icon">👥</div>
                  <p className="quiz-empty-text">
                    Ushbu guruhda o'quvchilar topilmadi.
                  </p>
                </div>
              ) : (
                filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className={`quiz-student-item ${selectedStudents.includes(student.id) ? "selected" : ""}`}
                    onClick={() => toggleStudent(student.id)}
                  >
                    <div className="quiz-student-checkbox">
                      {selectedStudents.includes(student.id) && (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </div>
                    <div className="quiz-student-info">
                      <span className="quiz-student-name">{student.name}</span>
                      <span className="quiz-student-email">
                        {student.email}
                      </span>
                    </div>
                    <span className="quiz-group-badge">{student.group}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* Save & Assign */}
        <section className="quiz-card quiz-card-full">
          <div className="quiz-card-header">
            <div className="quiz-card-title">
              <div className="quiz-card-title-icon">💾</div>
              <div>
                <h2>Saqlash va Topshirish</h2>
                <p className="quiz-card-subtitle">
                  Testni saqlang va o'quvchilarga topshiring
                </p>
              </div>
            </div>
          </div>

          <div className="quiz-actions">
            <button
              className="quiz-btn quiz-btn-primary"
              onClick={saveTest}
              disabled={!canSave}
            >
              Testni Saqlash
            </button>
            <button
              className="quiz-btn quiz-btn-secondary"
              onClick={() => {
                setTestTitle("");
                setTestDescription("");
                setTimeLimit("");
                setDeadline("");
                setQuestions([
                  {
                    id: "q1",
                    type: "multiple",
                    text: "",
                    options: ["", "", "", ""],
                    correctAnswer: "",
                  },
                ]);
                setSelectedStudents([]);
                setNotification("");
                setSuccessMessage("");
                setLastCredentials([]);
              }}
            >
              🔄 Formani Tozalash
            </button>
          </div>

          {successMessage && (
            <div className="quiz-success-banner">
              <span>🎉 {successMessage}</span>
              <span style={{ opacity: 0.7 }}>{notification}</span>
            </div>
          )}

          {!canSave &&
            (testTitle ||
              testDescription ||
              questions.some((q) => q.text) ||
              selectedStudents.length > 0) && (
              <div className="quiz-notification">
                ⚠️ Barcha maydonlarni to'ldiring, savollar qo'shing va kamida
                bitta o'quvchini tanlang.
              </div>
            )}
        </section>

        {/* Generated Credentials */}
        {lastCredentials.length > 0 && (
          <section className="quiz-card quiz-card-full">
            <div className="quiz-card-header">
              <div className="quiz-card-title">
                <div className="quiz-card-title-icon">🔑</div>
                <div>
                  <h2>Yaratilgan O'quvchi Ma'lumotlari</h2>
                  <p className="quiz-card-subtitle">
                    Faqat o'qituvchi uchun ko'rsatiladi
                  </p>
                </div>
              </div>
            </div>

            <div className="quiz-credentials-grid">
              {lastCredentials.map((credential) => (
                <div
                  key={credential.assignmentId}
                  className="quiz-credential-item"
                >
                  <span className="quiz-credential-name">
                    👤 {credential.name}
                  </span>
                  <div className="quiz-credential-detail">
                    <span className="quiz-credential-label">Email:</span>
                    <span className="quiz-credential-value">
                      {credential.email}
                    </span>
                  </div>
                  <div className="quiz-credential-detail">
                    <span className="quiz-credential-label">Login:</span>
                    <span className="quiz-credential-value">
                      {credential.username}
                    </span>
                  </div>
                  <div className="quiz-credential-detail">
                    <span className="quiz-credential-label">Parol:</span>
                    <span className="quiz-credential-value">
                      {credential.password}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Results Dashboard */}
        <section className="quiz-card quiz-card-full">
          <div className="quiz-card-header">
            <div className="quiz-card-title">
              <div className="quiz-card-title-icon">📊</div>
              <div>
                <h2>Natijalar Paneli</h2>
                <p className="quiz-card-subtitle">
                  O'quvchilarning natijalarini ko'rib chiqing
                </p>
              </div>
            </div>
            {assignments.length > 0 && (
              <button
                className="quiz-btn quiz-btn-primary quiz-btn-sm"
                onClick={() => setShowExportModal(true)}
              >
                📥 Natijalarni Yuklab Olish
              </button>
            )}
          </div>

          {/* Export Modal */}
          {showExportModal && (
            <div
              className="quiz-modal-overlay"
              onClick={() => setShowExportModal(false)}
            >
              <div className="quiz-modal" onClick={(e) => e.stopPropagation()}>
                <div className="quiz-modal-header">
                  <h3>📥 Natijalarni Yuklab Olish</h3>
                  <button
                    className="quiz-modal-close"
                    onClick={() => setShowExportModal(false)}
                  >
                    ✕
                  </button>
                </div>
                <div className="quiz-modal-body">
                  <p
                    style={{
                      marginBottom: "16px",
                      color: "rgba(255,255,255,0.7)",
                    }}
                  >
                    Qaysi testning natijalarini yuklab olmoqchisiz?
                  </p>
                  <div className="quiz-field">
                    <select
                      className="quiz-select"
                      value={selectedQuizForExport}
                      onChange={(e) => setSelectedQuizForExport(e.target.value)}
                    >
                      <option value="all">Barcha testlar</option>
                      {[...new Set(assignments.map((a) => a.testId))].map(
                        (quizId) => {
                          const quiz = assignments.find(
                            (a) => a.testId === quizId,
                          );
                          return (
                            <option key={quizId} value={quizId}>
                              {quiz?.quizTitle || "Noma'lum test"}
                            </option>
                          );
                        },
                      )}
                    </select>
                  </div>
                </div>
                <div className="quiz-modal-footer">
                  <button
                    className="quiz-btn quiz-btn-secondary"
                    onClick={() => setShowExportModal(false)}
                  >
                    Bekor qilish
                  </button>
                  <button
                    className="quiz-btn quiz-btn-primary"
                    onClick={() => exportResults(selectedQuizForExport)}
                  >
                    📥 Yuklab Olish
                  </button>
                </div>
              </div>
            </div>
          )}

          {assignments.length === 0 ? (
            <div className="quiz-empty">
              <div className="quiz-empty-icon">📭</div>
              <p className="quiz-empty-text">
                Hali hech kim testga topshirilmagan.
              </p>
            </div>
          ) : (
            <div className="quiz-table-wrapper">
              <table className="quiz-table">
                <thead>
                  <tr>
                    <th>Test Nomi</th>
                    <th>Muddat</th>
                    <th>O'quvchi Ismi</th>
                    <th>Email</th>
                    <th>Ball</th>
                    <th>Holat</th>
                    <th>Amal</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment) => (
                    <tr key={assignment.assignmentId}>
                      <td style={{ fontWeight: 500 }}>
                        {assignment.quizTitle}
                      </td>
                      <td
                        style={{
                          color: "rgba(255,255,255,0.6)",
                          fontSize: "0.85rem",
                        }}
                      >
                        {assignment.deadline
                          ? new Date(assignment.deadline).toLocaleDateString(
                              "uz-UZ",
                            )
                          : "-"}
                      </td>
                      <td style={{ fontWeight: 500 }}>{assignment.name}</td>
                      <td
                        style={{
                          color: "rgba(255,255,255,0.5)",
                          fontSize: "0.85rem",
                        }}
                      >
                        {assignment.email}
                      </td>
                      <td>
                        <span
                          className={`quiz-score ${
                            assignment.score >= 80
                              ? "high"
                              : assignment.score >= 50
                                ? "medium"
                                : assignment.score > 0
                                  ? "low"
                                  : "zero"
                          }`}
                        >
                          {assignment.score}%
                        </span>
                      </td>
                      <td>
                        <span
                          className={`quiz-status-badge ${
                            assignment.status === "Bajarildi"
                              ? "completed"
                              : "not-attempted"
                          }`}
                        >
                          {assignment.status === "Bajarildi" ? "✅" : "⏳"}{" "}
                          {assignment.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="quiz-btn quiz-btn-secondary quiz-btn-sm"
                          onClick={() =>
                            simulateSubmission(assignment.assignmentId)
                          }
                          disabled={assignment.status === "Bajarildi"}
                        >
                          🎲 Simulyatsiya
                        </button>
                        <button
                          style={styles.deleteBtn}
                          onClick={() => handleDeleteTest(assignment.testId)}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

const styles = {
  dashboard: {
    display: "flex",
    minHeight: "100vh",
    overflowY: "auto",
    background:
      "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    color: "#ffffff",
  },
  sidebar: {
    width: "280px",
    background: "rgba(255, 255, 255, 0.03)",
    backdropFilter: "blur(20px)",
    borderRight: "1px solid rgba(255, 255, 255, 0.08)",
    padding: "32px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "32px",
    position: "sticky",
    top: "0",
    height: "100vh",
    flexShrink: "0",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "0 8px",
  },
  logoIcon: {
    width: "48px",
    height: "48px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    boxShadow: "0 8px 32px rgba(102, 126, 234, 0.3)",
  },
  logoText: {
    fontSize: "1.3rem",
    fontWeight: "700",
    background: "linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    letterSpacing: "-0.02em",
  },
  menu: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  menuItem: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "14px 18px",
    borderRadius: "16px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    border: "1px solid transparent",
    fontSize: "0.95rem",
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.7)",
    background: "transparent",
    width: "100%",
    textAlign: "left",
    position: "relative",
    overflow: "hidden",
  },
  menuItemActive: {
    background:
      "linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)",
    color: "#ffffff",
    borderColor: "rgba(102, 126, 234, 0.3)",
    boxShadow: "0 4px 20px rgba(102, 126, 234, 0.15)",
  },
  menuIcon: {
    fontSize: "1.2rem",
    width: "24px",
    textAlign: "center",
  },
  main: {
    flex: "1",
    padding: "32px",
    overflowY: "auto",
  },
  header: {
    marginBottom: "32px",
  },
  headerTitle: {
    fontSize: "2rem",
    fontWeight: "700",
    marginBottom: "8px",
  },
  headerSubtitle: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: "1rem",
  },
  card: {
    background: "rgba(255, 255, 255, 0.03)",
    borderRadius: "20px",
    padding: "24px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    marginBottom: "24px",
  },
  cardFull: {
    background: "rgba(255, 255, 255, 0.03)",
    borderRadius: "20px",
    padding: "24px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  cardTitle: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  cardTitleIcon: {
    width: "48px",
    height: "48px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
  },
  cardTitleText: {
    fontSize: "1.25rem",
    fontWeight: "600",
  },
  cardSubtitle: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: "0.875rem",
    marginTop: "4px",
  },
  field: {
    marginBottom: "20px",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: "0.875rem",
  },
  input: {
    width: "100%",
    padding: "14px 18px",
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "12px",
    color: "#ffffff",
    fontSize: "1rem",
    outline: "none",
    transition: "all 0.3s ease",
  },
  select: {
    width: "100%",
    padding: "14px 18px",
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "12px",
    color: "#ffffff",
    fontSize: "1rem",
    outline: "none",
    cursor: "pointer",
  },
  btn: {
    padding: "14px 28px",
    borderRadius: "12px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
    border: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  },
  btnPrimary: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "#ffffff",
    boxShadow: "0 4px 20px rgba(102, 126, 234, 0.3)",
  },
  btnSecondary: {
    background: "rgba(255, 255, 255, 0.1)",
    color: "#ffffff",
    border: "1px solid rgba(255, 255, 255, 0.2)",
  },
  btnSm: {
    padding: "8px 16px",
    fontSize: "0.875rem",
  },
  questionList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  questionCard: {
    background: "rgba(255, 255, 255, 0.05)",
    borderRadius: "16px",
    padding: "20px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },
  questionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  questionNumber: {
    fontWeight: "600",
    color: "#667eea",
  },
  questionType: {
    fontSize: "0.875rem",
    color: "rgba(255, 255, 255, 0.6)",
  },
  questionText: {
    fontSize: "1rem",
    marginBottom: "16px",
    color: "#ffffff",
  },
  optionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "12px",
  },
  optionLabel: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px 18px",
    background: "rgba(255, 255, 255, 0.05)",
    borderRadius: "12px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
  optionRadio: {
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    border: "2px solid rgba(255, 255, 255, 0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "16px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "600",
    fontSize: "0.875rem",
  },
  td: {
    padding: "16px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "0.875rem",
    fontWeight: "500",
    background: "rgba(34, 197, 94, 0.15)",
    color: "#22c55e",
  },
  statusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#22c55e",
  },
  emptyState: {
    textAlign: "center",
    padding: "48px",
    color: "rgba(255, 255, 255, 0.6)",
  },
  emptyIcon: {
    fontSize: "48px",
    marginBottom: "16px",
  },
  successAlert: {
    padding: "16px 24px",
    background: "rgba(34, 197, 94, 0.15)",
    borderRadius: "12px",
    border: "1px solid rgba(34, 197, 94, 0.3)",
    color: "#22c55e",
    marginBottom: "24px",
  },
  errorAlert: {
    padding: "16px 24px",
    background: "rgba(239, 68, 68, 0.15)",
    borderRadius: "12px",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    color: "#ef4444",
    marginBottom: "24px",
  },
  notification: {
    padding: "16px 24px",
    background: "rgba(102, 126, 234, 0.15)",
    borderRadius: "12px",
    border: "1px solid rgba(102, 126, 234, 0.3)",
    color: "#667eea",
    marginBottom: "24px",
  },
  studentList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    maxHeight: "400px",
    overflowY: "auto",
  },
  studentItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    background: "rgba(255, 255, 255, 0.05)",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
  studentCheckbox: {
    width: "20px",
    height: "20px",
    borderRadius: "6px",
    border: "2px solid rgba(255, 255, 255, 0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  studentInfo: {
    flex: "1",
  },
  studentName: {
    fontWeight: "500",
    color: "#ffffff",
  },
  studentEmail: {
    fontSize: "0.875rem",
    color: "rgba(255, 255, 255, 0.6)",
  },
  studentGroup: {
    fontSize: "0.75rem",
    color: "rgba(255, 255, 255, 0.5)",
    background: "rgba(255, 255, 255, 0.1)",
    padding: "4px 8px",
    borderRadius: "6px",
  },
  credentialsList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  credentialCard: {
    background: "rgba(255, 255, 255, 0.05)",
    borderRadius: "12px",
    padding: "16px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },
  credentialHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  credentialCode: {
    fontFamily: "monospace",
    fontSize: "1.25rem",
    fontWeight: "700",
    color: "#667eea",
    background: "rgba(102, 126, 234, 0.1)",
    padding: "8px 16px",
    borderRadius: "8px",
  },
  loadingContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "400px",
    color: "rgba(255, 255, 255, 0.6)",
  },
  deleteBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    border: "1px solid rgba(255, 80, 80, 0.4)",
    background: "rgba(255, 80, 80, 0.1)",
    color: "#ff6b6b",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1rem",
    flexShrink: 0,
  },
};
