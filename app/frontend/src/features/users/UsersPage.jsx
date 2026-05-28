import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Lock, Mail, Search, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { DataShell, EmptyState, Field, PageIntro, PrimaryButton } from "../../components/ui/Workspace.jsx";
import { getErrorMessage, api } from "../../lib/api.js";

export function UsersPage() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [keyword, setKeyword] = useState("");
  const [detail, setDetail] = useState({ fullName: "", email: "", phone: "", roleId: "", departmentId: "", isActive: true });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedUser = users.find((user) => user.id === selectedId) || users[0];

  function loadUsers(nextSelectedId = selectedId) {
    api.get("/users").then((response) => {
      const items = response.data.data;
      setUsers(items);
      const nextSelected = items.find((item) => item.id === nextSelectedId) || items[0];
      setSelectedId(nextSelected?.id || null);
      if (nextSelected) {
        setDetailFromUser(nextSelected);
      }
    });
  }

  function setDetailFromUser(user) {
    setDetail({
      fullName: user.fullName || "",
      email: user.email || "",
      phone: user.phone || "",
      roleId: user.role?.id || "",
      departmentId: user.department?.id || "",
      isActive: Boolean(user.isActive),
    });
  }

  useEffect(() => {
    loadUsers();
    api.get("/departments").then((response) => setDepartments(response.data.data));
    api.get("/catalog/roles").then((response) => {
      setRoles(response.data.data.filter((role) => ["ADMIN", "REQUESTER", "ASSIGNEE"].includes(role.code)));
    });
  }, []);

  const filteredUsers = useMemo(() => {
    const value = keyword.trim().toLowerCase();
    if (!value) return users;

    return users.filter((user) => (
      user.fullName?.toLowerCase().includes(value)
      || user.email?.toLowerCase().includes(value)
      || user.role?.name?.toLowerCase().includes(value)
      || user.department?.name?.toLowerCase().includes(value)
    ));
  }, [keyword, users]);

  function selectUser(user) {
    setSelectedId(user.id);
    setDetailFromUser(user);
    setMessage("");
    setError("");
  }

  function updateField(field, value) {
    setDetail((current) => ({ ...current, [field]: value }));
  }

  async function handleSave() {
    if (!selectedUser) return;

    setMessage("");
    setError("");

    try {
      await api.put(`/users/${selectedUser.id}`, {
        fullName: detail.fullName,
        phone: detail.phone,
        roleId: detail.roleId,
        departmentId: detail.departmentId,
      });
      await api.patch(`/users/${selectedUser.id}/status`, { isActive: detail.isActive });
      setMessage("Đã cập nhật hồ sơ và phân quyền tài khoản");
      loadUsers(selectedUser.id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleDelete() {
    if (!selectedUser) return;

    const confirmed = window.confirm(`Xóa hoặc khóa tài khoản ${selectedUser.email}?`);
    if (!confirmed) return;

    setMessage("");
    setError("");

    try {
      const response = await api.delete(`/users/${selectedUser.id}`);
      setMessage(response.data.message || "Đã xử lý tài khoản");
      loadUsers();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Employee directory"
        title="Quản lý tài khoản nhân viên"
        description="Chọn một tài khoản để xem hồ sơ đầy đủ, đổi vai trò, gán bộ phận, khóa hoặc xóa tài khoản khỏi hệ thống."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <DataShell>
          <div className="border-b border-white/10 p-4">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/42" />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                className="app-input w-full py-3 pl-11 pr-4 text-sm"
                placeholder="Tìm theo tên, email, vai trò, bộ phận"
              />
            </div>
          </div>

          <div className="divide-y divide-white/10">
            {filteredUsers.map((user) => {
              const active = selectedUser?.id === user.id;
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => selectUser(user)}
                  className={`grid w-full gap-2 px-5 py-4 text-left transition hover:bg-white/7 sm:grid-cols-2 lg:grid-cols-[1fr_1.1fr_0.8fr_0.9fr] lg:gap-4 ${active ? "bg-white/10" : ""}`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">{user.fullName}</div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-white/45">
                      {user.isActive ? <CheckCircle2 className="h-3.5 w-3.5 text-green-200" /> : <Lock className="h-3.5 w-3.5 text-red-200" />}
                      {user.isActive ? "Hoạt động" : "Đã khóa"}
                    </div>
                  </div>
                  <div className="truncate text-sm text-white/62">{user.email}</div>
                  <div className="truncate text-sm text-white/62">{user.role?.name}</div>
                  <div className="truncate text-sm text-white/62">{user.department?.name || "Chưa gán"}</div>
                </button>
              );
            })}
            {!filteredUsers.length && <EmptyState>Không tìm thấy tài khoản phù hợp.</EmptyState>}
          </div>
        </DataShell>

        <aside className="app-section rounded-[32px] p-6">
          {selectedUser ? (
            <div className="space-y-6">
              <div>
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-black">
                  <UserRound className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-semibold text-white">{selectedUser.fullName}</h2>
                <div className="mt-2 flex items-center gap-2 text-sm text-white/55">
                  <Mail className="h-4 w-4" />
                  {selectedUser.email}
                </div>
              </div>

              <div className="grid gap-4">
                <Field label="Họ tên">
                  <input className="app-input w-full px-4 py-3 text-sm" value={detail.fullName} onChange={(event) => updateField("fullName", event.target.value)} />
                </Field>

                <Field label="Số điện thoại">
                  <input className="app-input w-full px-4 py-3 text-sm" value={detail.phone || ""} onChange={(event) => updateField("phone", event.target.value)} placeholder="Chưa có số điện thoại" />
                </Field>

                <Field label="Vai trò">
                  <select className="app-input w-full px-4 py-3 text-sm" value={detail.roleId} onChange={(event) => updateField("roleId", event.target.value)}>
                    {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                  </select>
                </Field>

                <Field label="Bộ phận">
                  <select className="app-input w-full px-4 py-3 text-sm" value={detail.departmentId} onChange={(event) => updateField("departmentId", event.target.value)}>
                    <option value="">Không thuộc bộ phận</option>
                    {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                  </select>
                </Field>

                <label className="flex items-center justify-between rounded-3xl bg-white/7 p-4">
                  <span>
                    <span className="block text-sm font-medium text-white">Trạng thái tài khoản</span>
                    <span className="mt-1 block text-xs text-white/45">Tài khoản bị khóa sẽ không thể đăng nhập.</span>
                  </span>
                  <input type="checkbox" checked={detail.isActive} onChange={(event) => updateField("isActive", event.target.checked)} className="h-5 w-5 accent-white" />
                </label>
              </div>

              {(message || error) && (
                <div className={`rounded-2xl px-4 py-3 text-sm ${error ? "bg-red-500/15 text-red-100" : "bg-green-500/15 text-green-100"}`}>
                  {error || message}
                </div>
              )}

              <div className="grid gap-3">
                <PrimaryButton type="button" onClick={handleSave}>
                  <ShieldCheck className="h-4 w-4" />
                  Lưu phân quyền
                </PrimaryButton>
                <button type="button" onClick={handleDelete} className="inline-flex items-center justify-center gap-2 rounded-full border border-red-300/25 bg-red-500/12 px-5 py-2.5 text-sm font-semibold text-red-100 hover:bg-red-500/20">
                  <Trash2 className="h-4 w-4" />
                  Xóa hoặc khóa tài khoản
                </button>
              </div>
            </div>
          ) : (
            <EmptyState>Chọn một tài khoản để xem chi tiết.</EmptyState>
          )}
        </aside>
      </div>
    </div>
  );
}
