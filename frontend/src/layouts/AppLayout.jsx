import { Outlet } from "react-router";

import Sidebar from "../components/Sidebar";

export default function AppLayout({ rol }) {
  return (
    <div className="app-layout">
      <Sidebar rol={rol} />

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}