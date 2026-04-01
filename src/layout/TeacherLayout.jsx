import { Outlet } from "react-router-dom";

export default function TeacherLayout() {
  return (
    <div className="teacher-layout">
      {/* Agar sidebar shu yerda bo‘lsa */}
      {/* <TeacherSidebar /> */}

      <Outlet />
    </div>
  );
}
