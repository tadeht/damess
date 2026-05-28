import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Search } from "lucide-react";
import { PriorityBadge } from "../../components/ui/PriorityBadge.jsx";
import { StatusBadge } from "../../components/ui/StatusBadge.jsx";
import { DataShell, EmptyState, PageIntro } from "../../components/ui/Workspace.jsx";
import { api } from "../../lib/api.js";

export function RequestsPage() {
  const [requests, setRequests] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (keyword) params.set("keyword", keyword);
    if (status) params.set("status", status);

    api.get(`/requests?${params.toString()}`).then((response) => {
      setRequests(response.data.data.items);
    });
  }, [keyword, status]);

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Request desk"
        title="Quản lý vòng đời yêu cầu"
        description="Tìm kiếm, lọc trạng thái và mở nhanh từng yêu cầu để phân công hoặc cập nhật tiến độ."
        action={(
          <Link to="/requests/new" className="app-button inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm">
            Tạo yêu cầu
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        )}
      />

      <div className="app-section flex flex-col gap-3 rounded-[28px] p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/42" />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
              className="w-full rounded-full border border-white/15 bg-white/8 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-white/50 md:w-72"
            placeholder="Tìm mã hoặc tiêu đề"
          />
          </div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-full border border-white/15 bg-white/8 px-4 py-2.5 text-sm outline-none focus:border-white/50"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="CHO_TIEP_NHAN">Chờ tiếp nhận</option>
            <option value="DA_PHAN_CONG">Đã phân công</option>
            <option value="DANG_XU_LY">Đang xử lý</option>
            <option value="HOAN_THANH">Hoàn thành</option>
          </select>
        </div>
      </div>

      <DataShell>
        <table className="w-full min-w-[800px] border-collapse">
          <thead className="bg-white/5">
            <tr>
              <th className="table-head">Mã</th>
              <th className="table-head">Tiêu đề</th>
              <th className="table-head">Loại</th>
              <th className="table-head">Ưu tiên</th>
              <th className="table-head">Trạng thái</th>
              <th className="table-head">Người xử lý</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {requests.map((request) => (
              <tr key={request.id} className="hover:bg-white/5">
                <td className="table-cell font-medium text-primary">
                  <Link to={`/requests/${request.id}`}>{request.requestCode}</Link>
                </td>
                <td className="table-cell">{request.title}</td>
                <td className="table-cell text-slate-600">{request.requestType?.name}</td>
                <td className="table-cell"><PriorityBadge priority={request.priority} /></td>
                <td className="table-cell"><StatusBadge status={request.status} /></td>
                <td className="table-cell text-slate-600">{request.assignedTo?.fullName || "Chưa phân công"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!requests.length && <EmptyState>Không có yêu cầu phù hợp.</EmptyState>}
      </DataShell>
    </div>
  );
}
