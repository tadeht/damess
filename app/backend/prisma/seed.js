import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { code: "ADMIN" },
      update: { name: "Quản trị viên", description: "Quản trị toàn hệ thống" },
      create: { name: "Quản trị viên", code: "ADMIN", description: "Quản trị toàn hệ thống" },
    }),
    prisma.role.upsert({
      where: { code: "REQUESTER" },
      update: { name: "Người dùng", description: "Tạo yêu cầu gửi đến bộ phận xử lý" },
      create: { name: "Người dùng", code: "REQUESTER", description: "Tạo yêu cầu gửi đến bộ phận xử lý" },
    }),
    prisma.role.upsert({
      where: { code: "ASSIGNEE" },
      update: { name: "Người xử lý", description: "Tiếp nhận và xử lý yêu cầu được giao" },
      create: { name: "Người xử lý", code: "ASSIGNEE", description: "Tiếp nhận và xử lý yêu cầu được giao" },
    }),
  ]);

  const roleByCode = Object.fromEntries(roles.map((role) => [role.code, role]));

  const priorities = await Promise.all([
    prisma.priority.upsert({
      where: { code: "THAP" },
      update: {},
      create: { name: "Thấp", code: "THAP", level: 1, color: "#64748B" },
    }),
    prisma.priority.upsert({
      where: { code: "TRUNG_BINH" },
      update: {},
      create: { name: "Trung bình", code: "TRUNG_BINH", level: 2, color: "#2563EB" },
    }),
    prisma.priority.upsert({
      where: { code: "CAO" },
      update: {},
      create: { name: "Cao", code: "CAO", level: 3, color: "#F59E0B" },
    }),
    prisma.priority.upsert({
      where: { code: "KHAN_CAP" },
      update: {},
      create: { name: "Khẩn cấp", code: "KHAN_CAP", level: 4, color: "#DC2626" },
    }),
  ]);

  const priorityByCode = Object.fromEntries(priorities.map((priority) => [priority.code, priority]));

  await Promise.all([
    prisma.status.upsert({
      where: { code: "CHO_TIEP_NHAN" },
      update: {},
      create: { name: "Chờ tiếp nhận", code: "CHO_TIEP_NHAN", color: "#64748B", sortOrder: 1 },
    }),
    prisma.status.upsert({
      where: { code: "DA_PHAN_CONG" },
      update: {},
      create: { name: "Đã phân công", code: "DA_PHAN_CONG", color: "#2563EB", sortOrder: 2 },
    }),
    prisma.status.upsert({
      where: { code: "DANG_XU_LY" },
      update: {},
      create: { name: "Đang xử lý", code: "DANG_XU_LY", color: "#F59E0B", sortOrder: 3 },
    }),
    prisma.status.upsert({
      where: { code: "CAN_BO_SUNG" },
      update: {},
      create: { name: "Cần bổ sung thông tin", code: "CAN_BO_SUNG", color: "#8B5CF6", sortOrder: 4 },
    }),
    prisma.status.upsert({
      where: { code: "TAM_DUNG" },
      update: {},
      create: { name: "Tạm dừng", code: "TAM_DUNG", color: "#6B7280", sortOrder: 5 },
    }),
    prisma.status.upsert({
      where: { code: "HOAN_THANH" },
      update: {},
      create: { name: "Hoàn thành", code: "HOAN_THANH", color: "#16A34A", sortOrder: 6, isFinal: true },
    }),
    prisma.status.upsert({
      where: { code: "TU_CHOI" },
      update: {},
      create: { name: "Từ chối", code: "TU_CHOI", color: "#DC2626", sortOrder: 7, isFinal: true },
    }),
    prisma.status.upsert({
      where: { code: "QUA_HAN" },
      update: {},
      create: { name: "Quá hạn", code: "QUA_HAN", color: "#B91C1C", sortOrder: 8 },
    }),
  ]);

  await Promise.all([
    prisma.processingRule.upsert({
      where: { code: "BAT_BUOC_GHI_KET_QUA_HOAN_THANH" },
      update: {},
      create: {
        name: "Bắt buộc ghi kết quả khi hoàn thành",
        code: "BAT_BUOC_GHI_KET_QUA_HOAN_THANH",
        scope: "REQUEST_STATUS",
        description: "Khi chuyển yêu cầu sang trạng thái Hoàn thành, người xử lý phải nhập ghi chú kết quả xử lý.",
      },
    }),
    prisma.processingRule.upsert({
      where: { code: "PHAN_CONG_TRUOC_KHI_XU_LY" },
      update: {},
      create: {
        name: "Phân công trước khi xử lý",
        code: "PHAN_CONG_TRUOC_KHI_XU_LY",
        scope: "ASSIGNMENT",
        description: "Yêu cầu cần có người hoặc bộ phận phụ trách trước khi chuyển sang trạng thái Đang xử lý.",
      },
    }),
  ]);

  const departments = await Promise.all([
    prisma.department.upsert({
      where: { code: "HC" },
      update: { status: "ACTIVE", isActive: true },
      create: { name: "Phòng Hành chính", code: "HC", description: "Tiếp nhận và xử lý yêu cầu hành chính", status: "ACTIVE", isActive: true },
    }),
    prisma.department.upsert({
      where: { code: "KD" },
      update: { status: "ACTIVE", isActive: true },
      create: { name: "Phòng Kinh doanh", code: "KD", description: "Xử lý yêu cầu liên quan đến khách hàng và kinh doanh", status: "ACTIVE", isActive: true },
    }),
    prisma.department.upsert({
      where: { code: "KT" },
      update: { status: "ACTIVE", isActive: true },
      create: { name: "Phòng Kỹ thuật", code: "KT", description: "Xử lý yêu cầu kỹ thuật và hỗ trợ hệ thống", status: "ACTIVE", isActive: true },
    }),
    prisma.department.upsert({
      where: { code: "VH" },
      update: { status: "ACTIVE", isActive: true },
      create: { name: "Phòng Vận hành", code: "VH", description: "Theo dõi vận hành và xử lý quy trình nội bộ", status: "ACTIVE", isActive: true },
    }),
  ]);

  const departmentByCode = Object.fromEntries(departments.map((department) => [department.code, department]));
  const passwordHash = await bcrypt.hash("123456", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      fullName: "Quản trị hệ thống",
      email: "admin@example.com",
      passwordHash,
      roleId: roleByCode.ADMIN.id,
      departmentId: departmentByCode.VH.id,
      emailVerifiedAt: new Date(),
    },
  });

  const processorLead = await prisma.user.upsert({
    where: { email: "lead.kt@example.com" },
    update: {
      fullName: "Nguyễn Minh Quản",
      roleId: roleByCode.ASSIGNEE.id,
      departmentId: departmentByCode.KT.id,
      emailVerifiedAt: new Date(),
    },
    create: {
      fullName: "Nguyễn Minh Quản",
      email: "lead.kt@example.com",
      passwordHash,
      roleId: roleByCode.ASSIGNEE.id,
      departmentId: departmentByCode.KT.id,
      emailVerifiedAt: new Date(),
    },
  });

  const requester = await prisma.user.upsert({
    where: { email: "nhanvien.kd@example.com" },
    update: {},
    create: {
      fullName: "Trần Thu Hà",
      email: "nhanvien.kd@example.com",
      passwordHash,
      roleId: roleByCode.REQUESTER.id,
      departmentId: departmentByCode.KD.id,
      emailVerifiedAt: new Date(),
    },
  });

  const assignee = await prisma.user.upsert({
    where: { email: "xuly.kt@example.com" },
    update: {},
    create: {
      fullName: "Lê Anh Tuấn",
      email: "xuly.kt@example.com",
      passwordHash,
      roleId: roleByCode.ASSIGNEE.id,
      departmentId: departmentByCode.KT.id,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.department.update({
    where: { id: departmentByCode.KT.id },
    data: { managerId: processorLead.id },
  });

  await prisma.user.updateMany({
    where: { email: "manager.kt@example.com" },
    data: { roleId: roleByCode.ASSIGNEE.id },
  });

  await prisma.role.deleteMany({
    where: { code: "MANAGER" },
  });

  await prisma.user.updateMany({
    where: { emailVerifiedAt: null },
    data: {
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
    },
  });

  await Promise.all([
    prisma.requestType.upsert({
      where: { code: "HO_TRO_KY_THUAT" },
      update: {},
      create: {
        name: "Hỗ trợ kỹ thuật",
        code: "HO_TRO_KY_THUAT",
        description: "Yêu cầu hỗ trợ kỹ thuật nội bộ",
        defaultPriorityId: priorityByCode.TRUNG_BINH.id,
      },
    }),
    prisma.requestType.upsert({
      where: { code: "YEU_CAU_NGHIEP_VU" },
      update: {},
      create: {
        name: "Yêu cầu nghiệp vụ",
        code: "YEU_CAU_NGHIEP_VU",
        description: "Yêu cầu làm rõ hoặc xử lý nghiệp vụ",
        defaultPriorityId: priorityByCode.CAO.id,
      },
    }),
    prisma.requestType.upsert({
      where: { code: "CAP_TAI_KHOAN" },
      update: {},
      create: {
        name: "Yêu cầu cấp tài khoản",
        code: "CAP_TAI_KHOAN",
        description: "Yêu cầu cấp hoặc điều chỉnh tài khoản",
        defaultPriorityId: priorityByCode.THAP.id,
      },
    }),
  ]);

  console.log("Seed data đã được tạo.");
  console.log("Tài khoản demo:");
  console.log("- admin@example.com / 123456");
  console.log("- lead.kt@example.com / 123456");
  console.log("- nhanvien.kd@example.com / 123456");
  console.log("- xuly.kt@example.com / 123456");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
