import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FileText } from "lucide-react";
import { PriorityBadge } from "../../components/ui/PriorityBadge.jsx";
import { StatusBadge } from "../../components/ui/StatusBadge.jsx";
import { getErrorMessage, api } from "../../lib/api.js";

const statusOptions = [
  { code: "DANG_XU_LY", name: "Đang xử lý" },
  { code: "CAN_BO_SUNG", name: "Cần bổ sung thông tin" },
  { code: "TAM_DUNG", name: "Tạm dừng" },
  { code: "HOAN_THANH", name: "Hoàn thành" },
  { code: "TU_CHOI", name: "Từ chối" },
];

export function RequestDetailPage() {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [comments, setComments] = useState([]);
  const [histories, setHistories] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [assignForm, setAssignForm] = useState({ assignedToId: "", assignedDepartmentId: "" });
  const [statusForm, setStatusForm] = useState({ statusCode: "", note: "" });

  function loadData() {
    Promise.all([
      api.get(`/requests/${id}`),
      api.get(`/requests/${id}/comments`),
      api.get(`/requests/${id}/histories`),
      api.get("/departments"),
      api.get("/users").catch(() => ({ data: { data: [] } })),
    ]).then(([requestRes, commentsRes, historiesRes, departmentsRes, usersRes]) => {
      setRequest(requestRes.data.data);
      setComments(commentsRes.data.data);
      setHistories(historiesRes.data.data);
      setDepartments(departmentsRes.data.data);
      setUsers(usersRes.data.data);
    });
  }

  useEffect(() => {
    loadData();
  }, [id]);

  async function handleAssign(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      await api.post(`/requests/${id}/assign`, assignForm);
      setMessage("Phân công yêu cầu thành công");
      loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleStatus(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      await api.post(`/requests/${id}/status`, statusForm);
      setStatusForm({ statusCode: "", note: "" });
      setMessage("Cập nhật trạng thái thành công");
      loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleComment(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      await api.post(`/requests/${id}/comments`, { content: comment });
      setComment("");
      setMessage("Thêm ghi chú thành công");
      loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (!request) {
    return <div className="text-sm text-white/55">Đang tải yêu cầu...</div>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
      <div className="space-y-6">
        <section className="liquid-glass rounded-[28px] p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-sm font-medium text-white/62">{request.requestCode}</div>
              <h2 className="mt-2 text-4xl font-semibold leading-tight text-white">{request.title}</h2>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-white/62">{request.description}</p>
            </div>
            <div className="flex gap-2">
              <StatusBadge status={request.status} />
              <PriorityBadge priority={request.priority} />
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Info label="Workspace" value={request.workspace?.name || "Không gắn workspace"} />
            <Info label="Phạm vi" value={request.visibility === "PRIVATE" ? "Riêng tư" : "Public"} />
            <Info label="Loại yêu cầu" value={request.requestType?.name} />
            <Info label="Người tạo" value={request.createdBy?.fullName} />
            <Info label="Người xử lý" value={request.assignedTo?.fullName || "Chưa phân công"} />
            <Info label="Bộ phận xử lý" value={request.assignedDepartment?.name || "Chưa phân công"} />
          </div>
        </section>

        <section className="liquid-glass rounded-[28px] p-6">
          <h3 className="text-2xl font-semibold text-white">File và ảnh đính kèm</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {request.attachments?.length ? (
              request.attachments.map((attachment) => (
                <RequestAttachmentItem key={attachment.id} attachment={attachment} />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-white/42">Yêu cầu này chưa có file hoặc ảnh đính kèm.</div>
            )}
          </div>
        </section>

        <section className="liquid-glass rounded-[28px] p-6">
          <h3 className="text-2xl font-semibold text-white">Ghi chú xử lý</h3>
          <form onSubmit={handleComment} className="mt-4 flex gap-3">
            <input
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              className="flex-1 rounded-full border border-white/15 bg-white/8 px-4 py-2.5 text-sm outline-none focus:border-white/50"
              placeholder="Nhập ghi chú"
            />
            <button className="liquid-glass-strong rounded-full px-5 py-2.5 text-sm font-semibold">Gửi</button>
          </form>
          <div className="mt-4 space-y-3">
            {comments.map((item) => (
              <div key={item.id} className="rounded-2xl bg-white/7 p-4">
                <div className="text-sm font-medium text-white">{item.user?.fullName}</div>
                <div className="mt-1 text-sm text-white/62">{item.content}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="space-y-6">
        {(message || error) && (
          <div className={`rounded-2xl px-4 py-3 text-sm ${error ? "bg-red-500/15 text-red-100" : "bg-green-500/15 text-green-100"}`}>
            {error || message}
          </div>
        )}

        <section className="liquid-glass rounded-[28px] p-6">
          <h3 className="text-2xl font-semibold text-white">Phân công</h3>
          <form onSubmit={handleAssign} className="mt-4 space-y-3">
            <select className="w-full rounded-full border border-white/15 bg-white/8 px-4 py-2.5 text-sm" value={assignForm.assignedDepartmentId} onChange={(event) => setAssignForm((current) => ({ ...current, assignedDepartmentId: event.target.value }))}>
              <option value="">Chọn bộ phận</option>
              {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
            <select className="w-full rounded-full border border-white/15 bg-white/8 px-4 py-2.5 text-sm" value={assignForm.assignedToId} onChange={(event) => setAssignForm((current) => ({ ...current, assignedToId: event.target.value }))}>
              <option value="">Chọn người xử lý</option>
              {users.map((user) => <option key={user.id} value={user.id}>{user.fullName}</option>)}
            </select>
            <button className="liquid-glass-strong w-full rounded-full px-5 py-2.5 text-sm font-semibold">Phân công</button>
          </form>
        </section>

        <section className="liquid-glass rounded-[28px] p-6">
          <h3 className="text-2xl font-semibold text-white">Cập nhật trạng thái</h3>
          <form onSubmit={handleStatus} className="mt-4 space-y-3">
            <select className="w-full rounded-full border border-white/15 bg-white/8 px-4 py-2.5 text-sm" value={statusForm.statusCode} onChange={(event) => setStatusForm((current) => ({ ...current, statusCode: event.target.value }))}>
              <option value="">Chọn trạng thái</option>
              {statusOptions.map((status) => <option key={status.code} value={status.code}>{status.name}</option>)}
            </select>
            <textarea className="w-full rounded-2xl border border-white/15 bg-white/8 px-4 py-3 text-sm" rows={3} value={statusForm.note} onChange={(event) => setStatusForm((current) => ({ ...current, note: event.target.value }))} placeholder="Ghi chú/kết quả xử lý" />
            <button className="liquid-glass-strong w-full rounded-full px-5 py-2.5 text-sm font-semibold">Cập nhật</button>
          </form>
        </section>

        <section className="liquid-glass rounded-[28px] p-6">
          <h3 className="text-2xl font-semibold text-white">Lịch sử xử lý</h3>
          <div className="mt-4 space-y-3">
            {histories.map((history) => (
              <div key={history.id} className="border-l-2 border-white/20 pl-3">
                <div className="text-sm font-medium text-white">{history.action}</div>
                <div className="text-xs text-white/45">{history.actor?.fullName}</div>
                {history.note && <div className="mt-1 text-sm text-white/62">{history.note}</div>}
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-normal text-white/42">{label}</div>
      <div className="mt-1 text-sm text-white/82">{value}</div>
    </div>
  );
}

function RequestAttachmentItem({ attachment }) {
  const isImage = attachment.type === "IMAGE" || attachment.mime?.startsWith("image/");

  if (isImage) {
    return (
      <a href={attachment.data} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-2xl border border-white/10 bg-black/20">
        <img src={attachment.data} alt={attachment.name} className="h-44 w-full object-cover transition group-hover:scale-[1.02]" />
        <div className="px-3 py-2 text-xs text-white/62">{attachment.name}</div>
      </a>
    );
  }

  return (
    <a href={attachment.data} download={attachment.name} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-white/70 hover:bg-white/10 hover:text-white">
      <FileText className="h-5 w-5" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{attachment.name}</span>
        <span className="block text-xs text-white/38">{attachment.mime || "File đính kèm"}</span>
      </span>
    </a>
  );
}
