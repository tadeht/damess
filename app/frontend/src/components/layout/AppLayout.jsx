import { ArrowUpRight, BarChart3, Building2, CalendarDays, ClipboardCheck, ClipboardList, FilePlus2, Home, LogOut, Search, ShieldCheck, Sparkles, Tags, Users } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../app/AuthContext.jsx";
import { AppBackground } from "../ui/AppBackground.jsx";

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: Home, roles: ["ADMIN", "ASSIGNEE"] },
  { label: "Yêu cầu", to: "/requests", icon: ClipboardList, roles: ["ADMIN", "ASSIGNEE", "REQUESTER"] },
  { label: "Tạo yêu cầu", to: "/requests/new", icon: FilePlus2, roles: ["ADMIN", "REQUESTER"] },
  { label: "Bộ phận xử lý", to: "/processing", icon: ClipboardCheck, roles: ["ADMIN", "ASSIGNEE"] },
  { label: "Báo cáo", to: "/reports", icon: BarChart3, roles: ["ADMIN"] },
  { label: "Người dùng", to: "/users", icon: Users, roles: ["ADMIN"] },
  { label: "Bộ phận", to: "/departments", icon: Building2, roles: ["ADMIN"] },
  { label: "Loại yêu cầu", to: "/request-types", icon: Tags, roles: ["ADMIN"] },
  { label: "Quy tắc xử lý", to: "/rules", icon: ShieldCheck, roles: ["ADMIN"] },
];

const titleByPath = {
  "/dashboard": "Dashboard",
  "/requests": "Danh sách yêu cầu",
  "/requests/new": "Tạo yêu cầu",
  "/processing": "Bộ phận xử lý",
  "/reports": "Báo cáo",
  "/users": "Quản lý người dùng",
  "/departments": "Quản lý bộ phận",
  "/request-types": "Quản lý loại yêu cầu",
  "/rules": "Quy tắc xử lý",
};

export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const title = titleByPath[location.pathname] || "Chi tiết yêu cầu";
  const roleCode = user?.role?.code;
  const today = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
  const visibleNavItems = navItems.filter((item) => item.roles.includes(roleCode));
  const adminItems = visibleNavItems.filter((item) => ["Người dùng", "Bộ phận", "Loại yêu cầu", "Quy tắc xử lý"].includes(item.label));
  const workItems = visibleNavItems.filter((item) => !["Người dùng", "Bộ phận", "Loại yêu cầu", "Quy tắc xử lý"].includes(item.label));

  return (
    <div className="min-h-screen bg-canvas font-body text-white">
      <AppBackground />
      <aside className="app-shell-card fixed inset-y-5 left-5 z-20 hidden w-80 flex-col rounded-[32px] lg:flex">
        <div className="shrink-0 border-b border-white/10 p-5">
          <div className="flex items-center gap-3">
            <NavLink
              to={window.location.protocol === "file:" ? "/workspaces" : "/"}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-black transition hover:scale-105"
              title="Về trang chủ"
              aria-label="Về trang chủ"
            >
              <Sparkles className="h-5 w-5" />
            </NavLink>
            <div>
              <div className="text-lg font-semibold leading-tight text-white">Damess</div>
              <div className="mt-1 text-xs text-white/50">Operations workspace</div>
            </div>
          </div>
          <div className="mt-5 rounded-3xl bg-white/7 p-4">
            <div className="text-xs font-semibold uppercase text-white/38">Phiên làm việc</div>
            <div className="mt-2 text-sm font-medium text-white">{user?.fullName}</div>
            <div className="mt-1 text-xs text-white/50">{user?.role?.name}</div>
          </div>
        </div>

        <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <NavGroup title="Nghiệp vụ" items={workItems} />
          {adminItems.length > 0 && <NavGroup title="Quản trị hệ thống" items={adminItems} />}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-4">
          <div className="rounded-3xl bg-black/22 p-4">
          <div className="text-xs font-semibold uppercase text-white/38">Truy cập nhanh</div>
          <NavLink to="/requests/new" className="mt-3 flex items-center justify-between rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black">
            Tạo yêu cầu
            <ArrowUpRight className="h-4 w-4" />
          </NavLink>
          </div>
        </div>
      </aside>

      <div className="relative z-10 lg:pl-[336px]">
        <header className="sticky top-0 z-20 px-4 pb-3 pt-4 lg:px-8">
          <div className="app-shell-card rounded-[30px] p-3 md:p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs text-white/48">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>{today}</span>
                </div>
                <h1 className="mt-1 text-2xl font-semibold leading-tight text-white md:text-3xl">{title}</h1>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="hidden min-w-80 items-center gap-3 rounded-full border border-white/12 bg-white/7 px-4 py-2.5 text-sm text-white/42 xl:flex">
                  <Search className="h-4 w-4" />
                  <span>Tìm yêu cầu, nhân viên, bộ phận...</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-full bg-white/8 py-1.5 pl-3 pr-1.5">
                  <div className="hidden text-right sm:block">
                    <div className="text-sm font-medium text-white">{user?.fullName}</div>
                    <div className="text-xs text-white/50">{user?.role?.name}</div>
                  </div>
                  <button
                    type="button"
                    onClick={logout}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition hover:scale-105"
                    title="Đăng xuất"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => [
                      "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium",
                      isActive ? "bg-white text-black" : "bg-white/8 text-white/68",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        </header>

        <main className="px-4 pb-10 pt-4 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavGroup({ title, items }) {
  return (
    <div>
      <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-normal text-white/38">{title}</div>
      <div className="space-y-1">
        {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/requests" || item.to === "/requests/new"}
                className={({ isActive }) => [
                  "group flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
                  isActive ? "bg-white text-black" : "text-white/66 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 opacity-35" />
              </NavLink>
            );
        })}
      </div>
    </div>
  );
}
