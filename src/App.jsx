import { Routes, Route } from "react-router-dom";

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
  return (
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
  );
}

export default App;
