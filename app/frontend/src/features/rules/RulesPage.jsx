import { useEffect, useMemo, useState } from "react";
import { Edit3, FilePlus2, ListChecks, Lock, Power, Save, ShieldCheck, SlidersHorizontal, Unlock, X } from "lucide-react";
import { DataShell, EmptyState, Field, MetricCard, PageIntro } from "../../components/ui/Workspace.jsx";
import { getErrorMessage, api } from "../../lib/api.js";

const emptyForm = {
  id: null,
  name: "",
  code: "",
  scope: "GENERAL",
  description: "",
};

const scopeLabels = {
  GENERAL: "Chung",
  ASSIGNMENT: "Phân công",
  REQUEST_STATUS: "Trạng thái yêu cầu",
  REPORT: "Báo cáo",
};

const scopeOptions = [
  { value: "GENERAL", label: "Chung" },
  { value: "ASSIGNMENT", label: "Phân công" },
  { value: "REQUEST_STATUS", label: "Trạng thái yêu cầu" },
  { value: "REPORT", label: "Báo cáo" },
];

export function RulesPage() {
  const [rules, setRules] = useState([]);
  const [scopeFilter, setScopeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const isEditing = Boolean(form.id);

  const summary = useMemo(() => ({
    total: rules.length,
    active: rules.filter((rule) => rule.isActive).length,
    scopes: new Set(rules.map((rule) => rule.scope).filter(Boolean)).size,
  }), [rules]);

  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      if (scopeFilter && rule.scope !== scopeFilter) return false;
      if (statusFilter === "active" && !rule.isActive) return false;
      if (statusFilter === "locked" && rule.isActive) return false;
      return true;
    });
  }, [rules, scopeFilter, statusFilter]);

  async function loadRules() {
    try {
      setLoading(true);
      const response = await api.get("/rules");
      setRules(response.data.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRules();
  }, []);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: field === "code" ? normalizeCode(value) : value,
    }));
  }

  function startCreate() {
    setForm(emptyForm);
    setError("");
    setMessage("");
  }

  function startEdit(rule) {
    setForm({
      id: rule.id,
      name: rule.name || "",
      code: rule.code || "",
      scope: rule.scope || "GENERAL",
      description: rule.description || "",
    });
    setError("");
    setMessage("");

    // Cuộn form vào tầm nhìn trên màn nhỏ.
    if (typeof window !== "undefined" && window.innerWidth < 1280) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);

    try {
      if (isEditing) {
        await api.put(`/rules/${form.id}`, {
          name: form.name,
          description: form.description,
          scope: form.scope,
        });
        setMessage("Đã cập nhật quy tắc xử lý.");
      } else {
        await api.post("/rules", form);
        setMessage("Đã thêm quy tắc xử lý.");
      }

      setForm(emptyForm);
      await loadRules();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleRuleStatus(rule) {
    setError("");
    setMessage("");

    try {
      await api.patch(`/rules/${rule.id}/status`, { isActive: !rule.isActive });
      setMessage(rule.isActive ? "Đã khóa quy tắc xử lý." : "Đã mở lại quy tắc xử lý.");
      await loadRules();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Quản trị hệ thống"
        title="Quy tắc xử lý yêu cầu"
        description="Khai báo các ràng buộc nghiệp vụ dùng trong phân công, chuyển trạng thái và báo cáo để chuẩn hóa quy trình xử lý nội bộ."
        action={(
          <div className="hidden rounded-full bg-white/10 p-3 text-white/70 lg:block">
            <ShieldCheck className="h-6 w-6" />
          </div>
        )}
      />

      {(message || error) && (
        <div className={`rounded-2xl px-4 py-3 text-sm ${error ? "bg-red-500/15 text-red-100" : "bg-emerald-500/15 text-emerald-100"}`}>
          {error || message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Tổng quy tắc" value={summary.total} icon={ListChecks} />
        <MetricCard label="Đang áp dụng" value={summary.active} icon={ShieldCheck} />
        <MetricCard label="Phạm vi đã dùng" value={summary.scopes} icon={SlidersHorizontal} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form onSubmit={handleSubmit} className="app-section rounded-[18px] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/55">
                {isEditing ? "Đang sửa" : "Quy tắc mới"}
              </div>
              <h2 className="text-2xl font-semibold text-white">
                {isEditing ? "Cập nhật quy tắc" : "Thêm quy tắc xử lý"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/58">
                {isEditing
                  ? "Chỉnh tên, mô tả hoặc đổi phạm vi áp dụng. Mã quy tắc khóa cứng để giữ tham chiếu."
                  : "Admin có thể khai báo điều kiện, cách áp dụng hoặc ràng buộc nghiệp vụ trong quá trình xử lý yêu cầu."}
              </p>
            </div>
            {isEditing ? (
              <button
                type="button"
                onClick={startCreate}
                className="rounded-full border border-white/12 p-2 text-white/65 hover:bg-white/10 hover:text-white"
                title="Hủy sửa"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <div className="rounded-full bg-white/10 p-2 text-white/70">
                <FilePlus2 className="h-4 w-4" />
              </div>
            )}
          </div>

          <div className="mt-6 space-y-4">
            <Field label="Tên quy tắc">
              <input
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                className="app-input w-full px-4 py-3 text-sm"
                placeholder="Ví dụ: Bắt buộc ghi kết quả khi hoàn thành"
              />
            </Field>

            <Field label="Mã quy tắc">
              <input
                value={form.code}
                onChange={(event) => updateField("code", event.target.value)}
                disabled={isEditing}
                className="app-input w-full px-4 py-3 font-mono text-sm disabled:cursor-not-allowed disabled:opacity-55"
                placeholder="BAT_BUOC_GHI_KET_QUA"
              />
              {isEditing && (
                <span className="mt-1.5 block text-xs text-white/45">
                  Mã quy tắc không đổi được sau khi tạo để tránh phá tham chiếu trong hệ thống.
                </span>
              )}
            </Field>

            <Field label="Phạm vi áp dụng">
              <select
                value={form.scope}
                onChange={(event) => updateField("scope", event.target.value)}
                className="app-input w-full px-4 py-3 text-sm"
              >
                {scopeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Nội dung quy tắc">
              <textarea
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                rows={5}
                className="app-input w-full rounded-[16px] px-4 py-3 text-sm"
                placeholder="Mô tả rõ điều kiện, cách áp dụng hoặc ràng buộc nghiệp vụ"
              />
            </Field>

            <button
              type="submit"
              disabled={submitting}
              className="app-button inline-flex w-full items-center justify-center gap-2 px-5 py-3 text-sm disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {submitting ? "Đang lưu..." : isEditing ? "Lưu thay đổi" : "Thêm quy tắc"}
            </button>
          </div>
        </form>

        <div className="space-y-4">
          <div className="app-section flex flex-col gap-3 rounded-[18px] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Danh sách quy tắc xử lý</h2>
              <p className="mt-0.5 text-sm text-white/52">Theo dõi phạm vi áp dụng và trạng thái hiệu lực của từng quy tắc.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={scopeFilter}
                onChange={(event) => setScopeFilter(event.target.value)}
                className="app-input rounded-full px-4 py-2 text-sm"
              >
                <option value="">Tất cả phạm vi</option>
                {scopeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="app-input rounded-full px-4 py-2 text-sm"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="active">Đang áp dụng</option>
                <option value="locked">Tạm khóa</option>
              </select>
            </div>
          </div>

          <DataShell>
            <div className="divide-y divide-white/8">
              {filteredRules.map((rule) => (
                <article key={rule.id} className="p-5 transition hover:bg-white/[0.04]">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-white">{rule.name}</h3>
                        <span className="rounded-md bg-white/8 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-white/55">
                          {rule.code}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full bg-blue-500/15 px-3 py-1 text-xs font-medium text-blue-200">
                          {scopeLabels[rule.scope] || rule.scope}
                        </span>
                        <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                          rule.isActive ? "bg-emerald-500/16 text-emerald-200" : "bg-white/8 text-white/50"
                        }`}>
                          {rule.isActive ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                          {rule.isActive ? "Đang áp dụng" : "Tạm khóa"}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(rule)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 text-white/65 hover:bg-white/10 hover:text-white"
                        title="Sửa quy tắc"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleRuleStatus(rule)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 text-white/65 hover:bg-white/10 hover:text-white"
                        title={rule.isActive ? "Khóa quy tắc" : "Mở lại quy tắc"}
                      >
                        <Power className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/62">
                    {rule.description || "Chưa có nội dung quy tắc."}
                  </p>
                </article>
              ))}

              {!loading && !filteredRules.length && rules.length > 0 && (
                <EmptyState>Không có quy tắc khớp với bộ lọc hiện tại.</EmptyState>
              )}
              {!loading && !rules.length && (
                <EmptyState>Chưa có quy tắc xử lý. Tạo quy tắc đầu tiên ở form bên trái.</EmptyState>
              )}
              {loading && <EmptyState>Đang tải danh sách quy tắc...</EmptyState>}
            </div>
          </DataShell>
        </div>
      </div>
    </div>
  );
}

function normalizeCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}
