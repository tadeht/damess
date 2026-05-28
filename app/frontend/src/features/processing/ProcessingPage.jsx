import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PriorityBadge } from "../../components/ui/PriorityBadge.jsx";
import { StatusBadge } from "../../components/ui/StatusBadge.jsx";
import { api } from "../../lib/api.js";

export function ProcessingPage() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);

    api.get(`/requests?${params.toString()}`).then((response) => {
      setItems(response.data.data.items);
    });
  }, [status]);

  return (
    <div className="space-y-4">
      <section className="liquid-glass rounded-[28px] p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-heading text-3xl italic text-white">Công việc cần xử lý</h2>
            <p className="mt-1 text-sm text-white/55">Khu vực dành cho bộ phận hoặc nhân viên xử lý theo dõi các yêu cầu được giao.</p>
          </div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-full border border-white/15 bg-white/8 px-4 py-2.5 text-sm outline-none focus:border-white/50"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="DA_PHAN_CONG">Đã phân công</option>
            <option value="DANG_XU_LY">Đang xử lý</option>
            <option value="CAN_BO_SUNG">Cần bổ sung</option>
            <option value="TAM_DUNG">Tạm dừng</option>
            <option value="HOAN_THANH">Hoàn thành</option>
          </select>
        </div>
      </section>

      <section className="liquid-glass overflow-hidden rounded-[28px]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead className="bg-white/5">
              <tr>
                <th className="table-head">Mã</th>
                <th className="table-head">Tiêu đề</th>
                <th className="table-head">Bộ phận</th>
                <th className="table-head">Người xử lý</th>
                <th className="table-head">Ưu tiên</th>
                <th className="table-head">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {items.map((request) => (
                <tr key={request.id} className="hover:bg-white/5">
                  <td className="table-cell font-medium text-primary">
                    <Link to={`/requests/${request.id}`}>{request.requestCode}</Link>
                  </td>
                  <td className="table-cell">{request.title}</td>
                  <td className="table-cell text-slate-600">{request.assignedDepartment?.name || "Chưa phân công"}</td>
                  <td className="table-cell text-slate-600">{request.assignedTo?.fullName || "Chưa phân công"}</td>
                  <td className="table-cell"><PriorityBadge priority={request.priority} /></td>
                  <td className="table-cell"><StatusBadge status={request.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!items.length && <div className="p-8 text-center text-sm text-white/50">Chưa có công việc cần xử lý.</div>}
      </section>
    </div>
  );
}
