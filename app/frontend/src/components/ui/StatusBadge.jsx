const statusClassByCode = {
  CHO_TIEP_NHAN: "bg-[#E7EAF0] text-[#1F2937]",
  DA_PHAN_CONG: "bg-[#DCE8FF] text-[#174EA6]",
  DANG_XU_LY: "bg-[#FFE8B5] text-[#7A4200]",
  CAN_BO_SUNG: "bg-[#EDE3FF] text-[#5B21B6]",
  TAM_DUNG: "bg-[#E5E7EB] text-[#374151]",
  HOAN_THANH: "bg-[#DDFBE8] text-[#166534]",
  TU_CHOI: "bg-[#FFE1E1] text-[#9B1C1C]",
  QUA_HAN: "bg-[#FECACA] text-[#7F1D1D]",
};

export function StatusBadge({ status }) {
  const code = typeof status === "string" ? status : status?.code;
  const label = typeof status === "string" ? status : status?.name;

  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${statusClassByCode[code] || "bg-[#E7EAF0] text-[#1F2937]"}`}>
      {label || "Không rõ"}
    </span>
  );
}
