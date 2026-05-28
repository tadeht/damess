import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, Clock3, CheckCircle2, AlertTriangle, Layers3 } from "lucide-react";
import { GlassPanel, MetricCard, PageIntro } from "../../components/ui/Workspace.jsx";
import { api } from "../../lib/api.js";

const cards = [
  { key: "total", label: "Tổng yêu cầu", icon: Layers3 },
  { key: "waiting", label: "Chờ tiếp nhận", icon: Clock3 },
  { key: "processing", label: "Đang xử lý", icon: Activity },
  { key: "completed", label: "Hoàn thành", icon: CheckCircle2 },
  { key: "overdue", label: "Quá hạn", icon: AlertTriangle },
];

export function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [byStatus, setByStatus] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get("/dashboard/summary"),
      api.get("/dashboard/by-status"),
      api.get("/requests?limit=5"),
    ]).then(([summaryRes, statusRes, requestsRes]) => {
      setSummary(summaryRes.data.data);
      setByStatus(statusRes.data.data);
      setRecentRequests(requestsRes.data.data.items);
    });
  }, []);

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Tổng quan vận hành"
        title="Bức tranh xử lý yêu cầu trong ngày"
        description="Theo dõi trạng thái tiếp nhận, tiến độ xử lý và các yêu cầu mới nhất để ưu tiên công việc đúng lúc."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <MetricCard key={card.key} label={card.label} value={summary?.[card.key] ?? 0} icon={Icon} tone={card.key === "overdue" ? "danger" : "default"} />
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <GlassPanel title="Thống kê theo trạng thái" description="Số lượng yêu cầu được nhóm theo từng bước xử lý.">
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byStatus}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.12)" />
                <XAxis dataKey="status" tick={{ fontSize: 12, fill: "rgba(255,255,255,0.58)" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "rgba(255,255,255,0.58)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "rgba(5,10,15,0.92)", border: "1px solid rgba(255,255,255,0.16)", borderRadius: 16, color: "#fff" }} />
                <Bar dataKey="count" fill="rgba(255,255,255,0.86)" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>

        <GlassPanel title="Yêu cầu gần đây" description="Các yêu cầu mới nhất cần theo dõi hoặc phân công tiếp.">
          <div className="mt-4 space-y-3">
            {recentRequests.map((request) => (
              <div key={request.id} className="group rounded-3xl border border-white/10 bg-white/6 p-4 transition hover:bg-white/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-white">{request.title}</div>
                    <div className="mt-1 text-xs text-white/48">{request.requestCode} · {request.status?.name}</div>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-white/45 transition group-hover:bg-white" />
                </div>
              </div>
            ))}
            {!recentRequests.length && <div className="text-sm text-white/50">Chưa có yêu cầu.</div>}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
