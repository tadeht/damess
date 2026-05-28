import { useEffect, useMemo, useState } from "react";
import { Edit3, Plus, Power, Save, Tags, X } from "lucide-react";
import { DataShell, EmptyState, PageIntro } from "../../components/ui/Workspace.jsx";
import { getErrorMessage, api } from "../../lib/api.js";

const emptyForm = {
  id: null,
  name: "",
  code: "",
  description: "",
  defaultPriorityId: "",
};

export function RequestTypesPage() {
  const [types, setTypes] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeCount = useMemo(() => types.filter((type) => type.isActive).length, [types]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [typesResponse, prioritiesResponse] = await Promise.all([
      api.get("/request-types?includeInactive=1"),
      api.get("/catalog/priorities"),
    ]);

    setTypes(typesResponse.data.data || []);
    setPriorities(prioritiesResponse.data.data || []);
  }

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

  function startEdit(type) {
    setForm({
      id: type.id,
      name: type.name || "",
      code: type.code || "",
      description: type.description || "",
      defaultPriorityId: type.defaultPriorityId || "",
    });
    setError("");
    setMessage("");
  }

  async function submitForm(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      if (form.id) {
        const response = await api.put(`/request-types/${form.id}`, {
          name: form.name,
          description: form.description,
          defaultPriorityId: form.defaultPriorityId,
        });
        setMessage(response.data.message || "Đã cập nhật loại yêu cầu.");
      } else {
        await api.post("/request-types", {
          name: form.name,
          code: form.code,
          description: form.description,
          defaultPriorityId: form.defaultPriorityId,
        });
        setMessage("Đã tạo loại yêu cầu mới.");
      }

      setForm(emptyForm);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleType(type) {
    setError("");
    setMessage("");

    try {
      const response = await api.patch(`/request-types/${type.id}/status`, { isActive: !type.isActive });
      setMessage(response.data.message || "Đã cập nhật trạng thái loại yêu cầu.");
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Danh mục nghiệp vụ"
        title="Loại yêu cầu và mức ưu tiên mặc định"
        description="Admin có thể tạo thêm không giới hạn loại yêu cầu theo nghiệp vụ của từng doanh nghiệp. Ba loại seed chỉ là dữ liệu demo ban đầu."
      />

      {(message || error) && (
        <div className={`rounded-2xl px-4 py-3 text-sm ${error ? "bg-red-500/15 text-red-100" : "bg-emerald-500/15 text-emerald-100"}`}>
          {error || message}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={submitForm} className="app-section rounded-[28px] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">{form.id ? "Sửa loại yêu cầu" : "Tạo loại yêu cầu"}</h2>
              <p className="mt-1 text-sm text-white/48">Mã loại dùng cho API và báo cáo, nên đặt ngắn gọn bằng chữ in hoa.</p>
            </div>
            {form.id ? (
              <button type="button" onClick={startCreate} className="rounded-full border border-white/12 p-2 text-white/62 hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            ) : (
              <div className="rounded-full bg-white/10 p-2 text-white/70">
                <Plus className="h-4 w-4" />
              </div>
            )}
          </div>

          <div className="mt-5 space-y-4">
            <Field label="Tên loại yêu cầu">
              <input
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                className="app-input w-full px-4 py-3 text-sm"
                placeholder="Ví dụ: Yêu cầu mua sắm thiết bị"
              />
            </Field>

            <Field label="Mã loại">
              <input
                value={form.code}
                onChange={(event) => updateField("code", event.target.value)}
                disabled={Boolean(form.id)}
                className="app-input w-full px-4 py-3 font-mono text-sm disabled:opacity-55"
                placeholder="YEU_CAU_MUA_SAM"
              />
            </Field>

            <Field label="Mức ưu tiên mặc định">
              <select
                value={form.defaultPriorityId}
                onChange={(event) => updateField("defaultPriorityId", event.target.value)}
                className="app-input w-full px-4 py-3 text-sm"
              >
                <option value="">Không đặt mặc định</option>
                {priorities.map((priority) => (
                  <option key={priority.id} value={priority.id}>{priority.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Mô tả">
              <textarea
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                rows={4}
                className="app-input w-full rounded-[24px] px-4 py-3 text-sm"
                placeholder="Mô tả khi nào nên chọn loại yêu cầu này"
              />
            </Field>

            <button type="submit" disabled={submitting} className="app-button inline-flex w-full items-center justify-center gap-2 px-5 py-3 text-sm disabled:opacity-60">
              <Save className="h-4 w-4" />
              {submitting ? "Đang lưu..." : form.id ? "Lưu thay đổi" : "Tạo loại yêu cầu"}
            </button>
          </div>
        </form>

        <div className="grid gap-4 md:grid-cols-2">
          <TypeStat label="Tổng loại yêu cầu" value={types.length} />
          <TypeStat label="Đang hoạt động" value={activeCount} />
          {types.slice(0, 4).map((type) => (
            <div key={type.id} className="app-section rounded-[26px] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                  <Tags className="h-5 w-5 text-white" />
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${type.isActive ? "bg-emerald-400/16 text-emerald-100" : "bg-white/10 text-white/45"}`}>
                  {type.isActive ? "Hoạt động" : "Đã khóa"}
                </span>
              </div>
              <div className="mt-4 text-lg font-semibold text-white">{type.name}</div>
              <div className="mt-1 font-mono text-xs font-medium uppercase text-white/42">{type.code}</div>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/56">{type.description || "Chưa có mô tả."}</p>
              <div className="mt-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs text-white/62">
                Ưu tiên: {type.defaultPriority?.name || "-"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <DataShell>
        <table className="w-full min-w-[820px] border-collapse">
          <thead className="bg-white/5">
            <tr>
              <th className="table-head">Mã</th>
              <th className="table-head">Tên loại</th>
              <th className="table-head">Mô tả</th>
              <th className="table-head">Ưu tiên mặc định</th>
              <th className="table-head">Trạng thái</th>
              <th className="table-head text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {types.map((type) => (
              <tr key={type.id} className="hover:bg-white/5">
                <td className="table-cell font-mono font-medium">{type.code}</td>
                <td className="table-cell">{type.name}</td>
                <td className="table-cell text-white/55">{type.description || "-"}</td>
                <td className="table-cell text-white/55">{type.defaultPriority?.name || "-"}</td>
                <td className="table-cell text-white/55">{type.isActive ? "Hoạt động" : "Đã khóa"}</td>
                <td className="table-cell">
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => startEdit(type)} className="rounded-full border border-white/12 p-2 text-white/62 hover:bg-white/10 hover:text-white" title="Sửa">
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => toggleType(type)} className="rounded-full border border-white/12 p-2 text-white/62 hover:bg-white/10 hover:text-white" title={type.isActive ? "Khóa" : "Mở lại"}>
                      <Power className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!types.length && <EmptyState>Chưa có loại yêu cầu.</EmptyState>}
      </DataShell>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase text-white/42">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function TypeStat({ label, value }) {
  return (
    <div className="app-section rounded-[26px] p-5">
      <div className="text-sm text-white/45">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
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
