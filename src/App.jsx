import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ConfirmModal from "./components/ConfirmModal";


import PublicLayout from "./layout/PublicLayout";
import TeacherLayout from "./layout/TeacherLayout";

import Home from "./pages/Home";
import Login from "./pages/Login";
import SignUp from "./pages/signUp";

import StudentLayout from "./layout/StudentLayout";
import StudentSettings from "./pages/StudentSettings";
import StudentDashboard from "./pages/StudentSection/StudentDashboard";
import StudentTeachers from "./pages/StudentTeachers";
import StudentGroups from "./pages/StudentSection/StudentGroups";

import TeacherPage from "./pages/TeacherPage";
import CreateCourse from "./pages/TeacherSections/CreateCourses";
import ProfileSettings from "./pages/TeacherSections/ProfileSettings";
import CreateLesson from "./pages/TeacherSections/CourseLessons";
import Notifications from "./pages/Notifications";
import Groups from "./pages/TeacherSections/Group";
import GroupChat from "./pages/TeacherSections/GroupChat";

function App() {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  const showConfirm = (title, message, onConfirm) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm,
    });
  };

  const closeConfirm = () => {
    setConfirmState({
      isOpen: false,
      title: "",
      message: "",
      onConfirm: null,
    });
  };

  // Make showConfirm globally available via window
  useEffect(() => {
    window.showConfirm = showConfirm;
  }, []);

  return (
    <>
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
      />
      <Routes>
      {/* 🌍 PUBLIC PAGES */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signUp" element={<SignUp />} />
      </Route>

      {/* 🎓 STUDENT DASHBOARD */}
      <Route path="/student" element={<StudentLayout />}>
        <Route index element={<StudentTeachers />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="settings" element={<StudentSettings />} />
        <Route path="groups" element={<StudentGroups />} />
        <Route
          path="group-chat/:groupId/:groupName"
          element={<GroupChat isTeacher={false} />}
        />
      </Route>


      {/* 👨‍🏫 TEACHER DASHBOARD */}
      <Route path="/teacher" element={<TeacherLayout />}>
        <Route index element={<TeacherPage />} />
        <Route path="create-course" element={<CreateCourse />} />
        <Route path="profile-settings" element={<ProfileSettings />} />
        <Route path="create-lesson" element={<CreateLesson />} />
        <Route path="notifications" element={<Notifications />} />

        {/* 🔥 GROUPS */}
        <Route path="groups">
          <Route index element={<Groups />} />
          <Route
            path="group-chat/:groupId/:groupName"
            element={<GroupChat isTeacher={true} />}
          />
        </Route>
      </Route>
    </Routes>
    </>
  );
}

export default App;
