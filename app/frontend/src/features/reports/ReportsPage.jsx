import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../../lib/api.js";

const colors = ["#2563EB", "#16A34A", "#F59E0B", "#DC2626", "#64748B", "#8B5CF6", "#0F766E", "#B91C1C"];

export function ReportsPage() {
  const [summary, setSummary] = useState(null);
  const [byStatus, setByStatus] = useState([]);
  const [byDepartment, setByDepartment] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get("/dashboard/summary"),
      api.get("/dashboard/by-status"),
      api.get("/dashboard/by-department"),
    ]).then(([summaryRes, statusRes, departmentRes]) => {
      setSummary(summaryRes.data.data);
      setByStatus(statusRes.data.data);
      setByDepartment(departmentRes.data.data);
    });
  }, []);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <ReportCard label="Tổng yêu cầu" value={summary?.total ?? 0} />
        <ReportCard label="Chờ tiếp nhận" value={summary?.waiting ?? 0} />
        <ReportCard label="Đang xử lý" value={summary?.processing ?? 0} />
        <ReportCard label="Hoàn thành" value={summary?.completed ?? 0} />
        <ReportCard label="Quá hạn" value={summary?.overdue ?? 0} danger />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="liquid-glass rounded-[28px] p-6">
          <h2 className="font-heading text-3xl italic text-white">Tỷ lệ yêu cầu theo trạng thái</h2>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byStatus.filter((item) => item.count > 0)} dataKey="count" nameKey="status" outerRadius={110} label>
                  {byStatus.map((item, index) => (
                    <Cell key={item.code} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "rgba(5,10,15,0.92)", border: "1px solid rgba(255,255,255,0.16)", borderRadius: 16, color: "#fff" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="liquid-glass rounded-[28px] p-6">
          <h2 className="font-heading text-3xl italic text-white">Số yêu cầu theo bộ phận</h2>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDepartment}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.12)" />
                <XAxis dataKey="department" tick={{ fontSize: 12, fill: "rgba(255,255,255,0.58)" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "rgba(255,255,255,0.58)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "rgba(5,10,15,0.92)", border: "1px solid rgba(255,255,255,0.16)", borderRadius: 16, color: "#fff" }} />
                <Bar dataKey="count" fill="rgba(255,255,255,0.86)" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="liquid-glass overflow-hidden rounded-[28px]">
        <div className="border-b border-white/10 px-6 py-5">
          <h2 className="font-heading text-3xl italic text-white">Bảng tổng hợp theo trạng thái</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse">
            <thead className="bg-white/5">
              <tr>
                <th className="table-head">Trạng thái</th>
                <th className="table-head">Mã</th>
                <th className="table-head">Số lượng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {byStatus.map((item) => (
                <tr key={item.code}>
                  <td className="table-cell font-medium">{item.status}</td>
                  <td className="table-cell text-slate-600">{item.code}</td>
                  <td className="table-cell text-slate-600">{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ReportCard({ label, value, danger = false }) {
  return (
    <div className={`liquid-glass rounded-[24px] p-5 ${danger ? "border-red-200" : ""}`}>
      <div className="text-sm text-white/58">{label}</div>
      <div className={`mt-3 font-heading text-5xl italic leading-none ${danger ? "text-red-100" : "text-white"}`}>{value}</div>
    </div>
  );
}
