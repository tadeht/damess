const priorityClassByCode = {
  THAP: "bg-[#E7EAF0] text-[#1F2937]",
  TRUNG_BINH: "bg-[#DCE8FF] text-[#174EA6]",
  CAO: "bg-[#FFE8B5] text-[#7A4200]",
  KHAN_CAP: "bg-[#FFE1E1] text-[#9B1C1C]",
};

export function PriorityBadge({ priority }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${priorityClassByCode[priority?.code] || "bg-[#E7EAF0] text-[#1F2937]"}`}>
      {priority?.name || "Không rõ"}
    </span>
  );
}
