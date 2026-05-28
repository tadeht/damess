import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Field, GlassPanel, PageIntro, PrimaryButton } from "../../components/ui/Workspace.jsx";
import { getErrorMessage, api } from "../../lib/api.js";

export function RequestCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [types, setTypes] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    requestTypeId: "",
    priorityId: "",
    dueDate: getTodayInputDate(),
    workspaceId: searchParams.get("workspaceId") || "",
    visibility: "PUBLIC",
    privateMemberIds: [],
    attachments: [],
  });
  const selectedWorkspace = workspaces.find((workspace) => String(workspace.id) === String(form.workspaceId));

  useEffect(() => {
    Promise.all([
      api.get("/catalog/priorities"),
      api.get("/workspaces").catch(() => ({ data: { data: [] } })),
    ]).then(([prioritiesRes, workspacesRes]) => {
      setPriorities(prioritiesRes.data.data);
      setWorkspaces(workspacesRes.data.data || []);
    });
  }, []);

  useEffect(() => {
    const query = form.workspaceId ? `?workspaceId=${form.workspaceId}` : "";
    api.get(`/request-types${query}`).then((typesRes) => {
      setTypes(typesRes.data.data || []);
    }).catch(() => {
      setTypes([]);
    });
  }, [form.workspaceId]);

  useEffect(() => {
    if (!form.workspaceId || !workspaces.length || form.dueDate !== getTodayInputDate()) {
      return;
    }

    const workspace = workspaces.find((item) => String(item.id) === String(form.workspaceId));
    const slaDueDate = getDateInputAfterHours(workspace?.defaultSlaHours);

    if (slaDueDate) {
      setForm((current) => ({ ...current, dueDate: slaDueDate }));
    }
  }, [form.workspaceId, form.dueDate, workspaces]);

  function updateField(field, value) {
    const nextWorkspace = field === "workspaceId"
      ? workspaces.find((workspace) => String(workspace.id) === String(value))
      : selectedWorkspace;
    const selectedType = field === "requestTypeId"
      ? types.find((type) => String(type.id) === String(value))
      : null;

    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "requestTypeId" && selectedType?.defaultPriorityId ? { priorityId: String(selectedType.defaultPriorityId) } : {}),
      ...(field === "workspaceId" ? { dueDate: getDateInputAfterHours(nextWorkspace?.defaultSlaHours) || getTodayInputDate(), requestTypeId: "" } : {}),
      ...(field === "workspaceId" ? { privateMemberIds: [] } : {}),
      ...(field === "visibility" && value === "PUBLIC" ? { privateMemberIds: [] } : {}),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      const response = await api.post("/requests", {
        ...form,
        privateMemberIds: form.visibility === "PRIVATE" ? form.privateMemberIds : [],
      });
      navigate(`/requests/${response.data.data.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function togglePrivateMember(userId) {
    setForm((current) => {
      const existed = current.privateMemberIds.includes(userId);
      return {
        ...current,
        privateMemberIds: existed
          ? current.privateMemberIds.filter((id) => id !== userId)
          : [...current.privateMemberIds, userId],
      };
    });
  }

  function handleAttachments(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    files.slice(0, 6).forEach((file) => {
      if (file.size > 2 * 1024 * 1024) {
        setError("Mỗi file đính kèm tối đa 2MB.");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setForm((current) => ({
          ...current,
          attachments: [
            ...current.attachments,
            {
              type: file.type.startsWith("image/") ? "IMAGE" : "FILE",
              name: file.name,
              mime: file.type || "application/octet-stream",
              data: String(reader.result || ""),
            },
          ].slice(0, 6),
        }));
      };
      reader.readAsDataURL(file);
    });
  }

  function removeAttachment(index) {
    setForm((current) => ({
      ...current,
      attachments: current.attachments.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Phiếu yêu cầu mới"
        title="Tạo yêu cầu xử lý"
        description="Mô tả rõ vấn đề, chọn đúng loại yêu cầu và mức ưu tiên để bộ phận xử lý tiếp nhận nhanh hơn."
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <form onSubmit={handleSubmit} className="app-section space-y-6 rounded-[32px] p-6 md:p-8">
      <Field label="Tiêu đề">
        <input
          value={form.title}
          onChange={(event) => updateField("title", event.target.value)}
          className="app-input w-full px-4 py-3 text-sm"
          placeholder="Nhập tiêu đề yêu cầu"
        />
      </Field>

      <Field label="Nội dung">
        <textarea
          value={form.description}
          onChange={(event) => updateField("description", event.target.value)}
          rows={5}
          className="app-input w-full rounded-[24px] px-4 py-3 text-sm"
          placeholder="Mô tả nội dung cần xử lý"
        />
      </Field>

      <Field label="File và ảnh đính kèm">
        <input
          type="file"
          multiple
          onChange={handleAttachments}
          className="app-input w-full px-4 py-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-black"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        />
        {form.attachments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {form.attachments.map((attachment, index) => (
              <button
                key={`${attachment.name}-${index}`}
                type="button"
                onClick={() => removeAttachment(index)}
                className="rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-xs text-white/70 hover:bg-white/12"
              >
                {attachment.type === "IMAGE" ? "Ảnh" : "File"}: {attachment.name}
              </button>
            ))}
          </div>
        )}
      </Field>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Workspace">
          <select
            value={form.workspaceId}
            onChange={(event) => updateField("workspaceId", event.target.value)}
            className="app-input w-full px-4 py-3 text-sm"
          >
            <option value="">Không gắn workspace</option>
            {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
          </select>
        </Field>

        <Field label="Phạm vi">
          <select
            value={form.visibility}
            onChange={(event) => updateField("visibility", event.target.value)}
            className="app-input w-full px-4 py-3 text-sm"
          >
            <option value="PUBLIC">Public</option>
            <option value="PRIVATE">Riêng tư</option>
          </select>
        </Field>

        <Field label="Loại yêu cầu">
          <select
            value={form.requestTypeId}
            onChange={(event) => updateField("requestTypeId", event.target.value)}
            className="app-input w-full px-4 py-3 text-sm"
          >
            <option value="">Chọn loại</option>
            {types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
          </select>
        </Field>

        <Field label="Mức ưu tiên">
          <select
            value={form.priorityId}
            onChange={(event) => updateField("priorityId", event.target.value)}
            className="app-input w-full px-4 py-3 text-sm"
          >
            <option value="">Chọn mức</option>
            {priorities.map((priority) => <option key={priority.id} value={priority.id}>{priority.name}</option>)}
          </select>
        </Field>

        <Field label="Hạn xử lý">
          <input
            type="date"
            value={form.dueDate}
            onChange={(event) => updateField("dueDate", event.target.value)}
            disabled={Boolean(selectedWorkspace && selectedWorkspace.allowRequesterDueDateOverride === false)}
            className="app-input w-full px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          />
          {selectedWorkspace?.defaultSlaHours ? (
            <div className="mt-2 text-xs text-white/45">SLA workspace: {formatSlaHours(selectedWorkspace.defaultSlaHours)}</div>
          ) : null}
        </Field>
      </div>

      {form.visibility === "PRIVATE" && form.workspaceId && (
        <div className="rounded-[24px] border border-violet-300/16 bg-violet-400/10 p-4">
          <div className="text-xs font-semibold uppercase text-violet-100/70">Thành viên được xem yêu cầu riêng tư</div>
          <div className="mt-3 grid max-h-48 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
            {(selectedWorkspace?.members || []).filter((member) => member.status === "ACTIVE").map((member) => (
              <label key={member.userId} className="flex items-center gap-3 rounded-xl bg-black/18 px-3 py-2 text-sm text-white/72">
                <input
                  type="checkbox"
                  checked={form.privateMemberIds.includes(member.userId)}
                  onChange={() => togglePrivateMember(member.userId)}
                />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-white">{member.user?.fullName || "Thành viên"}</span>
                  <span className="block truncate text-xs text-white/38">@{member.user?.username || member.user?.email}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="mt-2 text-xs text-violet-50/55">Người tạo, admin workspace và người được chọn sẽ xem được yêu cầu này.</div>
        </div>
      )}

      {error && <div className="rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-100">{error}</div>}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => navigate("/requests")} className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10">
          Hủy
        </button>
        <PrimaryButton type="submit">
          Lưu yêu cầu
          <ArrowUpRight className="h-4 w-4" />
        </PrimaryButton>
      </div>
    </form>

        <GlassPanel title="Checklist trước khi gửi" description="Những thông tin này giúp yêu cầu được phân công nhanh và hạn chế trao đổi lại.">
          <div className="space-y-3">
            {[
              "Tiêu đề ngắn gọn, nêu đúng vấn đề cần xử lý.",
              "Nội dung có bối cảnh, mong muốn và kết quả cần nhận.",
              "Mức ưu tiên phản ánh đúng độ khẩn cấp.",
              "Hạn xử lý phù hợp với tính chất công việc.",
            ].map((item, index) => (
              <div key={item} className="flex gap-3 rounded-2xl bg-white/6 p-4">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-black">{index + 1}</div>
                <div className="text-sm leading-6 text-white/66">{item}</div>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}

function getTodayInputDate() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function getDateInputAfterHours(hours) {
  const normalizedHours = Number(hours || 0);

  if (!Number.isFinite(normalizedHours) || normalizedHours <= 0) {
    return "";
  }

  const date = new Date(Date.now() + normalizedHours * 60 * 60 * 1000);
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function formatSlaHours(hours) {
  const normalizedHours = Number(hours || 0);

  if (!normalizedHours) {
    return "Chưa đặt SLA";
  }

  const days = Math.floor(normalizedHours / 24);
  const restHours = normalizedHours % 24;

  if (days && restHours) {
    return `${days} ngày ${restHours} giờ`;
  }

  if (days) {
    return `${days} ngày`;
  }

  return `${normalizedHours} giờ`;
}
