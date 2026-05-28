import { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, FilePlus2, PauseCircle, Search, Trash2 } from "lucide-react";
import { DataShell, EmptyState, Field, MetricCard, PageIntro, PrimaryButton } from "../../components/ui/Workspace.jsx";
import { getErrorMessage, api } from "../../lib/api.js";

const emptyForm = {
  name: "",
  code: "",
  description: "",
  status: "DRAFT",
};

const statusMeta = {
  ACTIVE: { label: "Hoạt động", className: "bg-[#DDFBE8] text-[#166534]" },
  SUSPENDED: { label: "Tạm ngưng", className: "bg-[#FFE8B5] text-[#7A4200]" },
  DRAFT: { label: "Nháp", className: "bg-[#E7EAF0] text-[#1F2937]" },
};

export function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState("create");
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedDepartment = departments.find((department) => department.id === selectedId);

  function setFormFromDepartment(department) {
    setForm({
      name: department.name || "",
      code: department.code || "",
      description: department.description || "",
      status: department.status || (department.isActive ? "ACTIVE" : "SUSPENDED"),
    });
  }

  function loadDepartments(nextSelectedId = selectedId) {
    api.get("/departments").then((response) => {
      const items = response.data.data;
      setDepartments(items);

      if (mode === "create") return;

      const nextSelected = items.find((item) => item.id === nextSelectedId) || items[0];
      setSelectedId(nextSelected?.id || null);
      if (nextSelected) setFormFromDepartment(nextSelected);
    });
  }

  useEffect(() => {
    loadDepartments();
  }, []);

  const summary = useMemo(() => ({
    total: departments.length,
    active: departments.filter((item) => item.status === "ACTIVE").length,
    draft: departments.filter((item) => item.status === "DRAFT").length,
    suspended: departments.filter((item) => item.status === "SUSPENDED").length,
  }), [departments]);

  const filteredDepartments = useMemo(() => {
    const value = keyword.trim().toLowerCase();
    if (!value) return departments;

    return departments.filter((department) => (
      department.name?.toLowerCase().includes(value)
      || department.code?.toLowerCase().includes(value)
      || department.description?.toLowerCase().includes(value)
      || statusMeta[department.status]?.label.toLowerCase().includes(value)
    ));
  }, [departments, keyword]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openCreate() {
    setMode("create");
    setSelectedId(null);
    setForm(emptyForm);
    setMessage("");
    setError("");
  }

  function selectDepartment(department) {
    setMode("edit");
    setSelectedId(department.id);
    setFormFromDepartment(department);
    setMessage("");
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      if (mode === "create") {
        const response = await api.post("/departments", form);
        setMessage("Đã tạo bộ phận ở trạng thái Nháp");
        setMode("edit");
        setSelectedId(response.data.data.id);
        loadDepartments(response.data.data.id);
      } else {
        await api.put(`/departments/${selectedDepartment.id}`, form);
        setMessage("Đã cập nhật bộ phận");
        loadDepartments(selectedDepartment.id);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function changeStatus(status) {
    if (!selectedDepartment) return;
    setMessage("");
    setError("");

    try {
      await api.patch(`/departments/${selectedDepartment.id}/status`, { status });
      setMessage(status === "ACTIVE" ? "Bộ phận đã được public và đưa vào hoạt động" : "Bộ phận đã chuyển sang Tạm ngưng");
      loadDepartments(selectedDepartment.id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleDelete() {
    if (!selectedDepartment) return;

    const isHardDelete = selectedDepartment.status === "SUSPENDED";
    const confirmed = window.confirm(isHardDelete
      ? `Xóa vĩnh viễn bộ phận ${selectedDepartment.name} khỏi danh sách?`
      : `Chuyển bộ phận ${selectedDepartment.name} sang trạng thái Tạm ngưng?`);

    if (!confirmed) return;

    setMessage("");
    setError("");

    try {
      const response = await api.delete(`/departments/${selectedDepartment.id}`);
      setMessage(response.data.message || "Đã cập nhật bộ phận");
      if (isHardDelete) {
        setMode("create");
        setSelectedId(null);
        setForm(emptyForm);
      }
      loadDepartments();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const panelTitle = mode === "create" ? "Tạo bộ phận nháp" : "Chi tiết bộ phận";
  const currentStatus = mode === "create" ? "DRAFT" : form.status;

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Cấu trúc tổ chức"
        title="Quản lý bộ phận xử lý"
        description="Tạo bộ phận ở trạng thái nháp, public khi sẵn sàng, tạm ngưng bằng soft delete và xóa vĩnh viễn khi không còn cần hiển thị."
        action={(
          <button type="button" onClick={openCreate} className="app-button inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm">
            <FilePlus2 className="h-4 w-4" />
            Tạo bộ phận
          </button>
        )}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Tổng bộ phận" value={summary.total} icon={Building2} />
        <MetricCard label="Đang hoạt động" value={summary.active} icon={CheckCircle2} />
        <MetricCard label="Bản nháp" value={summary.draft} icon={FilePlus2} />
        <MetricCard label="Tạm ngưng" value={summary.suspended} icon={PauseCircle} tone="danger" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <DataShell>
          <div className="border-b border-white/10 p-4">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/42" />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                className="app-input w-full py-3 pl-11 pr-4 text-sm"
                placeholder="Tìm mã, tên, mô tả hoặc trạng thái"
              />
            </div>
          </div>

          <table className="w-full min-w-[640px] border-collapse">
            <thead className="bg-white/5">
              <tr>
                <th className="table-head">Mã</th>
                <th className="table-head">Tên bộ phận</th>
                <th className="table-head">Mô tả</th>
                <th className="table-head">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredDepartments.map((department) => {
                const meta = statusMeta[department.status] || statusMeta.DRAFT;
                const active = selectedDepartment?.id === department.id;
                return (
                  <tr
                    key={department.id}
                    onClick={() => selectDepartment(department)}
                    className={`cursor-pointer hover:bg-white/7 ${active ? "bg-white/10" : ""}`}
                  >
                    <td className="table-cell font-semibold">{department.code}</td>
                    <td className="table-cell">{department.name}</td>
                    <td className="table-cell text-white/60">{department.description}</td>
                    <td className="table-cell">
                      <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${meta.className}`}>
                        {meta.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filteredDepartments.length && <EmptyState>Không tìm thấy bộ phận phù hợp.</EmptyState>}
        </DataShell>

        <aside className="app-section rounded-[32px] p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="mb-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase text-white/48">
                {statusMeta[currentStatus]?.label || "Nháp"}
              </div>
              <h2 className="text-2xl font-semibold text-white">{panelTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-white/52">
                {mode === "create"
                  ? "Bộ phận mới sẽ được lưu nháp trước, sau đó admin có thể public để đưa vào sử dụng."
                  : "Sửa thông tin, đổi trạng thái hoặc xóa bộ phận theo quy trình soft delete."}
              </p>
            </div>

            <Field label="Tên bộ phận">
              <input className="app-input w-full px-4 py-3 text-sm" value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Ví dụ: Phòng Chăm sóc khách hàng" />
            </Field>

            <Field label="Mã bộ phận">
              <input className="app-input w-full px-4 py-3 text-sm" value={form.code} onChange={(event) => updateField("code", event.target.value.toUpperCase())} placeholder="CSKH" />
            </Field>

            <Field label="Mô tả">
              <textarea className="app-input w-full rounded-[24px] px-4 py-3 text-sm" rows={4} value={form.description} onChange={(event) => updateField("description", event.target.value)} placeholder="Mô tả phạm vi tiếp nhận và xử lý" />
            </Field>

            {mode === "edit" && (
              <Field label="Trạng thái">
                <select className="app-input w-full px-4 py-3 text-sm" value={form.status} onChange={(event) => updateField("status", event.target.value)}>
                  <option value="DRAFT">Nháp</option>
                  <option value="ACTIVE">Hoạt động</option>
                  <option value="SUSPENDED">Tạm ngưng</option>
                </select>
              </Field>
            )}

            {(message || error) && (
              <div className={`rounded-2xl px-4 py-3 text-sm ${error ? "bg-red-500/15 text-red-100" : "bg-green-500/15 text-green-100"}`}>
                {error || message}
              </div>
            )}

            <div className="grid gap-3">
              <PrimaryButton type="submit">
                {mode === "create" ? "Lưu nháp" : "Lưu thay đổi"}
              </PrimaryButton>

              {mode === "edit" && selectedDepartment?.status !== "ACTIVE" && (
                <button type="button" onClick={() => changeStatus("ACTIVE")} className="app-button-secondary px-5 py-2.5 text-sm">
                  Public bộ phận
                </button>
              )}

              {mode === "edit" && selectedDepartment?.status === "ACTIVE" && (
                <button type="button" onClick={() => changeStatus("SUSPENDED")} className="app-button-secondary px-5 py-2.5 text-sm">
                  Tạm ngưng sử dụng
                </button>
              )}

              {mode === "edit" && (
                <button type="button" onClick={handleDelete} className="inline-flex items-center justify-center gap-2 rounded-full border border-red-300/25 bg-red-500/12 px-5 py-2.5 text-sm font-semibold text-red-100 hover:bg-red-500/20">
                  <Trash2 className="h-4 w-4" />
                  {selectedDepartment?.status === "SUSPENDED" ? "Xóa vĩnh viễn" : "Xóa mềm"}
                </button>
              )}
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}
