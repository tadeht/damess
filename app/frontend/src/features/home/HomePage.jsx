import {
  ArrowDown,
  ArrowUpRight,
  Building2,
  ChevronDown,
  ClipboardList,
  Clock3,
  Download,
  FilePlus2,
  History,
  KeyRound,
  LogOut,
  Monitor,
  Settings,
  ShieldCheck,
  UserCircle,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useAuth } from "../../app/AuthContext.jsx";
import { PortalLink } from "../../components/ui/PortalTransition.jsx";

const navLinks = [
  { label: "Trang chủ", href: "#home" },
  { label: "Tổ chức", href: "#organization" },
  { label: "Phân quyền", href: "#roles" },
  { label: "Quy trình", href: "#workflow" },
  { label: "Báo cáo", href: "#reports" },
  { label: "Tải xuống", href: "#download" },
];

const organizationCards = [
  {
    icon: Building2,
    title: "Đặt tên doanh nghiệp",
    desc: "Doanh nghiệp tự cấu hình tên hệ thống, tên tổ chức và thông tin nhận diện phù hợp với cách vận hành riêng.",
  },
  {
    icon: Settings,
    title: "Tạo phòng ban",
    desc: "Chủ động tạo bộ phận, trưởng bộ phận, trạng thái hoạt động và mô tả trách nhiệm của từng phòng ban.",
  },
  {
    icon: Users,
    title: "Quản lý người dùng",
    desc: "Thêm tài khoản, gán người dùng vào bộ phận, khóa/mở khóa tài khoản và kiểm soát trạng thái sử dụng.",
  },
  {
    icon: ShieldCheck,
    title: "Phân quyền theo cơ cấu",
    desc: "Gán quyền quản trị, quyền xử lý hoặc quyền gửi yêu cầu theo đúng vai trò của từng người trong doanh nghiệp.",
  },
];

const workflowSteps = [
  {
    icon: FilePlus2,
    title: "Gửi yêu cầu từ xa",
    desc: "Nhân viên hoặc bộ phận tạo yêu cầu qua web, không cần trao đổi trực tiếp tại văn phòng.",
  },
  {
    icon: ClipboardList,
    title: "Tiếp nhận tập trung",
    desc: "Yêu cầu được ghi nhận, gán mã, trạng thái và đưa vào danh sách theo dõi chung.",
  },
  {
    icon: Users,
    title: "Phân công xử lý",
    desc: "Admin hoặc bộ phận phụ trách chọn người xử lý, bộ phận xử lý và hạn xử lý nếu cần.",
  },
  {
    icon: Clock3,
    title: "Theo dõi tiến độ",
    desc: "Người xử lý cập nhật trạng thái, ghi chú, phản hồi và kết quả xử lý theo từng bước.",
  },
  {
    icon: History,
    title: "Lưu lịch sử",
    desc: "Mọi thay đổi quan trọng được lưu lại để kiểm tra, đối chiếu và báo cáo khi cần.",
  },
];

const roles = [
  ["ADMIN", "Quản trị doanh nghiệp", "Cấu hình tổ chức, bộ phận, người dùng, danh mục, báo cáo và toàn bộ yêu cầu."],
  ["ASSIGNEE", "Người xử lý", "Nhận yêu cầu được phân công, cập nhật tiến độ, ghi chú và phản hồi kết quả."],
  ["REQUESTER", "Người gửi yêu cầu", "Tạo yêu cầu từ xa cho người hoặc bộ phận phụ trách và theo dõi tình trạng xử lý."],
];

const reportItems = [
  ["Tổ chức", "Tên doanh nghiệp, bộ phận và người dùng do doanh nghiệp tự cấu hình."],
  ["Yêu cầu", "Theo dõi yêu cầu mới, đang xử lý, hoàn thành, quá hạn hoặc cần bổ sung."],
  ["Tiến độ", "Xem người xử lý, trạng thái hiện tại, ghi chú và lịch sử thay đổi."],
  ["Báo cáo", "Tổng hợp dữ liệu theo bộ phận, trạng thái và khối lượng xử lý."],
];

const revealItem = {
  hidden: { opacity: 0, y: 36, filter: "blur(14px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] },
  },
};

const revealGroup = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.08,
    },
  },
};

function getWorkspacePath(user) {
  return "/workspaces";
}

function SectionHeader({ eyebrow, title, desc }) {
  return (
    <motion.div variants={revealItem} className="mx-auto mb-12 max-w-3xl text-center">
      <div className="liquid-glass mb-4 inline-flex rounded-full px-3.5 py-1 text-xs font-medium text-white/75">
        {eyebrow}
      </div>
      <h2 className="text-4xl font-semibold leading-tight text-white md:text-5xl">{title}</h2>
      <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/58 md:text-base">{desc}</p>
    </motion.div>
  );
}

export function HomePage() {
  const { isAuthenticated, user, logout } = useAuth();
  const [hasScrolled, setHasScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState(() => window.location.hash || "#home");
  const [accountOpen, setAccountOpen] = useState(false);
  const workspacePath = getWorkspacePath(user);
  const primaryPath = isAuthenticated ? workspacePath : "/login";
  const primaryLabel = isAuthenticated ? "Đang mở workspace" : "Đang mở cổng đăng nhập";

  useEffect(() => {
    function handleScroll() {
      setHasScrolled(window.scrollY > 24);

      const anchorY = 180;
      const currentLink = navLinks.find((link) => {
        const section = document.querySelector(link.href);

        if (!section) {
          return false;
        }

        const rect = section.getBoundingClientRect();
        return rect.top <= anchorY && rect.bottom > anchorY;
      });

      if (currentLink) {
        setActiveSection(currentLink.href);
      }
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("hashchange", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("hashchange", handleScroll);
    };
  }, []);

  function handleLogoClick(event) {
    event.preventDefault();
    document.getElementById("home")?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", "/");
  }

  return (
    <main className="velorah-hero min-h-screen bg-background text-foreground">
      <section id="home" className="relative h-[100svh] min-h-[720px] overflow-hidden bg-black">
        <nav
          className={`home-nav fixed left-4 right-4 top-4 z-50 mx-auto flex max-w-7xl flex-row items-center justify-between px-6 py-3 md:px-8 ${
            hasScrolled ? "home-nav--floating" : "home-nav--top"
          }`}
        >
          <a href="#home" onClick={handleLogoClick} className="home-logo flex items-center" aria-label="Trở về màn hình chính">
            <img src="./logo_ss_refined.png" alt="Damess" className="h-9 w-auto object-contain" />
          </a>

          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => {
              const isActive = activeSection === link.href;

              return (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setActiveSection(link.href)}
                className={`home-nav__link text-sm transition-colors ${
                  isActive ? "home-nav__link--active text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </a>
              );
            })}
          </div>

          <PortalLink
            to="/login"
            label="Đang mở cổng đăng nhập"
            className={`liquid-glass rounded-full px-6 py-2.5 text-sm text-foreground transition hover:scale-[1.03] ${
              isAuthenticated ? "hidden" : "inline-flex"
            }`}
          >
            Bắt đầu
          </PortalLink>

          {isAuthenticated && (
            <div className="home-account">
              <button
                type="button"
                onClick={() => setAccountOpen((open) => !open)}
                className="home-account__button"
                aria-haspopup="menu"
                aria-expanded={accountOpen}
              >
                <UserCircle className="h-5 w-5" />
                <span className="hidden max-w-32 truncate sm:inline">{user?.fullName || "Tài khoản"}</span>
                <ChevronDown className={`h-4 w-4 transition ${accountOpen ? "rotate-180" : ""}`} />
              </button>

              {accountOpen && (
                <div className="home-account__menu" role="menu">
                  <div className="home-account__meta">
                    <div className="truncate text-sm font-semibold text-white">{user?.fullName}</div>
                    <div className="mt-0.5 truncate text-xs text-white/45">{user?.role?.name}</div>
                  </div>
                  <button type="button" className="home-account__item home-account__item--disabled" disabled role="menuitem">
                    <Settings className="h-4 w-4" />
                    Cài đặt
                    <span className="ml-auto text-[11px] font-semibold text-white/32">Sắp có</span>
                  </button>
                  <PortalLink
                    to="/change-password"
                    label="Đang mở đổi mật khẩu"
                    onClick={() => setAccountOpen(false)}
                    className="home-account__item"
                    role="menuitem"
                  >
                    <KeyRound className="h-4 w-4" />
                    Đổi mật khẩu
                  </PortalLink>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setAccountOpen(false);
                    }}
                    className="home-account__item home-account__item--danger"
                    role="menuitem"
                  >
                    <LogOut className="h-4 w-4" />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="home-hero-top-band" aria-hidden="true" />

        <div className="home-hero-stage relative overflow-hidden">
          <div className="home-bg-image home-bg-image--hero absolute inset-0 z-0 h-full w-full" />

          <section className="relative z-10 flex h-full flex-col items-center justify-center px-6 pb-14 pt-8 text-center">
            <h1
              className="animate-fade-rise max-w-7xl text-5xl font-normal leading-[0.95] tracking-[-2.46px] text-foreground sm:text-7xl md:text-8xl"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Damess đưa <em className="not-italic text-muted-foreground">yêu cầu nội bộ</em> đến{" "}
              <em className="not-italic text-muted-foreground">từ mọi nơi.</em>
            </h1>

            <p className="animate-fade-rise-delay mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Doanh nghiệp tự đặt tên hệ thống, tạo bộ phận, quản lý người dùng và phân quyền theo cơ cấu
              riêng. Nhân viên có thể gửi yêu cầu từ xa cho người hoặc bộ phận phụ trách, còn quản trị viên
              theo dõi toàn bộ tiến độ xử lý trong một không gian tập trung.
            </p>

            <div className="animate-fade-rise-delay-2 mt-12 flex flex-col items-center gap-4 sm:flex-row">
              <PortalLink
                to={primaryPath}
                label={primaryLabel}
                className="liquid-glass inline-flex cursor-pointer items-center gap-2 rounded-full px-14 py-5 text-base text-foreground transition hover:scale-[1.03]"
              >
                {isAuthenticated ? "Vào workspace" : "Bắt đầu sử dụng"}
                <ArrowUpRight className="h-5 w-5" />
              </PortalLink>
              <a
                href="#organization"
                className="liquid-glass inline-flex cursor-pointer items-center gap-2 rounded-full px-10 py-5 text-base text-foreground transition hover:scale-[1.03]"
              >
                Xem nội dung
                <ArrowDown className="h-5 w-5" />
              </a>
            </div>
          </section>
        </div>
      </section>

      <motion.section
        id="organization"
        className="relative min-h-screen overflow-hidden bg-black px-6 pb-24 pt-32"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.22 }}
        variants={revealGroup}
      >
        <div className="home-bg-image home-bg-image--section absolute inset-0 z-0 h-full w-full opacity-90" />
        <div className="absolute inset-0 z-0 bg-black/50" />
        <div className="home-section-wash pointer-events-none absolute inset-0 z-[1]" />
        <div className="home-section-top-veil pointer-events-none absolute inset-x-0 top-0 z-[1]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-48 bg-gradient-to-t from-black to-transparent" />

        <div className="relative z-10">
          <SectionHeader
            eyebrow="Tùy chỉnh doanh nghiệp"
            title="Mỗi doanh nghiệp tự cấu hình hệ thống của riêng mình."
            desc="Hệ thống không viết riêng cho một công ty cố định. Doanh nghiệp triển khai có thể tự tạo tên, bộ phận, người dùng và quyền sử dụng."
          />
          <motion.div variants={revealGroup} className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2 xl:grid-cols-4">
            {organizationCards.map((card) => {
              const Icon = card.icon;
              return (
                <motion.article key={card.title} variants={revealItem} className="liquid-glass rounded-[28px] p-6">
                  <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{card.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/56">{card.desc}</p>
                </motion.article>
              );
            })}
          </motion.div>
        </div>
      </motion.section>

      <motion.section
        id="roles"
        className="bg-black px-6 py-24"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.22 }}
        variants={revealGroup}
      >
        <SectionHeader
          eyebrow="Phân quyền"
          title="Doanh nghiệp tự gán vai trò theo cơ cấu nội bộ."
          desc="Mỗi vai trò tương ứng với trách nhiệm thực tế: quản trị hệ thống, xử lý yêu cầu hoặc gửi yêu cầu."
        />
        <motion.div variants={revealGroup} className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-3">
          {roles.map(([code, title, desc]) => (
            <motion.article key={code} variants={revealItem} className="liquid-glass rounded-[32px] p-7">
              <div className="mb-8 inline-flex rounded-full bg-white px-4 py-1.5 text-xs font-bold text-black">
                {code}
              </div>
              <h3 className="text-2xl font-semibold text-white">{title}</h3>
              <p className="mt-4 text-sm leading-7 text-white/58">{desc}</p>
            </motion.article>
          ))}
        </motion.div>
      </motion.section>

      <motion.section
        id="workflow"
        className="relative min-h-screen overflow-hidden bg-black px-6 py-24"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.22 }}
        variants={revealGroup}
      >
        <div className="home-bg-image home-bg-image--ambient absolute inset-0 z-0 h-full w-full opacity-85" />
        <div className="absolute inset-0 z-0 bg-black/52" />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-48 bg-gradient-to-b from-black to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-48 bg-gradient-to-t from-black to-transparent" />

        <div className="relative z-10">
          <SectionHeader
            eyebrow="Quy trình xử lý"
            title="Gửi yêu cầu từ xa, tiếp nhận tập trung, xử lý minh bạch."
            desc="Các yêu cầu phát sinh giữa cá nhân và bộ phận được gom về một nơi, có người phụ trách, trạng thái, ghi chú và lịch sử xử lý."
          />
          <motion.div variants={revealGroup} className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-5">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.article key={step.title} variants={revealItem} className="liquid-glass rounded-[28px] p-5">
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-semibold text-white/36">0{index + 1}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/56">{step.desc}</p>
                </motion.article>
              );
            })}
          </motion.div>
        </div>
      </motion.section>

      <motion.section
        id="reports"
        className="bg-black px-6 py-24"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.22 }}
        variants={revealGroup}
      >
        <motion.div variants={revealItem} className="liquid-glass mx-auto max-w-7xl rounded-[36px] p-8 md:p-12">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <div className="mb-4 inline-flex rounded-full border border-white/14 bg-white/8 px-3.5 py-1 text-xs font-semibold text-white/68">
                Dashboard và báo cáo
              </div>
              <h2 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
                Người quản trị nhìn được tình trạng xử lý trong toàn doanh nghiệp.
              </h2>
              <p className="mt-5 text-sm leading-7 text-white/58">
                Dashboard giúp theo dõi số lượng yêu cầu, trạng thái xử lý, bộ phận phụ trách và dữ liệu
                phục vụ đánh giá quy trình nội bộ.
              </p>
            </div>
            <motion.div variants={revealGroup} className="grid gap-4 sm:grid-cols-2">
              {reportItems.map(([title, desc]) => (
                <motion.div key={title} variants={revealItem} className="rounded-[28px] border border-white/10 bg-white/7 p-6">
                  <div className="text-3xl font-semibold text-white">{title}</div>
                  <div className="mt-3 text-sm text-white/56">{desc}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </motion.section>

      <motion.section
        id="download"
        className="relative min-h-[80vh] overflow-hidden bg-black px-6 py-32 flex items-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={revealGroup}
      >
        <div className="home-bg-image home-bg-image--ambient absolute inset-0 z-0 h-full w-full opacity-60" />
        <div className="absolute inset-0 z-0 bg-black/70" />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-48 bg-gradient-to-b from-black to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-48 bg-gradient-to-t from-black to-transparent" />

        <div className="relative z-10 mx-auto max-w-7xl w-full">
          <div className="grid gap-16 lg:grid-cols-12 items-center">
            {/* Left side: Premium description */}
            <div className="lg:col-span-7 space-y-8 text-left">
              <motion.div variants={revealItem}>
                <span className="liquid-glass border border-white/10 rounded-full px-4 py-1.5 text-xs font-semibold text-white/80">
                  Ứng dụng Máy tính
                </span>
              </motion.div>
              
              <motion.h2 
                variants={revealItem}
                className="text-4xl font-semibold leading-tight text-white md:text-5xl lg:text-6xl"
                style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-1px" }}
              >
                Trải nghiệm Damess <br className="hidden md:inline" />
                <span className="text-muted-foreground italic">mượt mà, độc lập</span> trên Desktop.
              </motion.h2>
              
              <motion.p variants={revealItem} className="text-base md:text-lg leading-relaxed text-white/50 max-w-xl">
                Tải ứng dụng máy tính để tối ưu quy trình xử lý yêu cầu. Giao diện chạy độc lập giúp tăng độ tập trung, khởi động tức thì và không bị phụ thuộc vào các tab của trình duyệt web.
              </motion.p>
              
              <motion.ul variants={revealGroup} className="space-y-4 text-sm text-white/70">
                <motion.li variants={revealItem} className="flex items-center gap-3.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold">✓</span>
                  <span>Khởi động trực tiếp từ Desktop, hỗ trợ chạy ẩn dưới thanh Taskbar.</span>
                </motion.li>
                <motion.li variants={revealItem} className="flex items-center gap-3.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold">✓</span>
                  <span>Tự động ghi nhớ phiên đăng nhập và đồng bộ tức thời với cơ sở dữ liệu đám mây.</span>
                </motion.li>
                <motion.li variants={revealItem} className="flex items-center gap-3.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold">✓</span>
                  <span>Đóng gói Portable gọn nhẹ, chạy ngay không cần cài đặt phức tạp.</span>
                </motion.li>
              </motion.ul>
            </div>

            {/* Right side: Premium Download Card */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <motion.div 
                variants={revealItem} 
                className="group relative w-full max-w-md"
              >
                {/* Glowing Aura backdrop */}
                <div className="absolute -inset-1 rounded-[32px] bg-gradient-to-r from-[#5865f2] to-[#8b5cf6] opacity-30 blur-2xl transition duration-1000 group-hover:opacity-50 group-hover:duration-200" />
                
                <div className="liquid-glass relative rounded-[32px] p-8 md:p-10 border border-white/10 shadow-2xl bg-black/40 backdrop-blur-2xl">
                  <div className="flex items-center gap-5 mb-8">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#5865f2]/10 border border-[#5865f2]/20 text-[#5865f2] shadow-inner">
                      <Monitor className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white tracking-wide">Damess cho Windows</h3>
                      <p className="text-xs text-white/40 mt-1">Phiên bản chính thức v1.0.0</p>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8 border-y border-white/8 py-6 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/40">Dung lượng file</span>
                      <span className="text-white/80 font-medium">~110 MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Định dạng gói</span>
                      <span className="text-white/80 font-medium">ZIP (Chạy trực tiếp)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Hệ điều hành</span>
                      <span className="text-white/80 font-medium">Windows 10 / 11 (64-bit)</span>
                    </div>
                  </div>

                  <a
                    href="https://github.com/tadeht/damess/releases/download/v1.0.1/Damess-Desktop.zip"
                    download
                    className="liquid-glass-strong w-full inline-flex cursor-pointer items-center justify-center gap-3 rounded-full py-4 px-6 text-base font-semibold text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(88,101,242,0.4)]"
                  >
                    <Download className="h-5 w-5" />
                    Tải xuống bản Desktop (ZIP)
                  </a>

                  <p className="mt-5 text-center text-xs text-white/30 leading-relaxed">
                    Tải về, giải nén thư mục và nhấp đúp vào tệp <strong className="text-white/50">Damess-Desktop.exe</strong> để mở ứng dụng.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.section>
    </main>
  );
}
