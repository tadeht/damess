import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, Search, X } from "lucide-react";
import { EMOJI_GROUPS, loadRecentEmojis, pushRecentEmoji, searchEmojis } from "../../lib/emojis.js";

const RECENT_KEY = "recent";

// Emoji picker phong cách Facebook: tab nhóm trên cùng (click để scroll đến nhóm),
// thanh tìm kiếm, danh sách emoji cuộn liên tục giữa các nhóm với sticky header.
export function EmojiPicker({ onSelect, onClose }) {
  const [recent, setRecent] = useState(() => loadRecentEmojis());
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState(recent.length ? RECENT_KEY : EMOJI_GROUPS[0].key);
  const scrollRef = useRef(null);
  const sectionRefs = useRef({});

  const searchResults = useMemo(() => searchEmojis(query), [query]);

  const tabs = useMemo(() => {
    const base = EMOJI_GROUPS.map((group) => ({
      key: group.key,
      label: group.label,
      icon: group.emojis[0]?.char || "🙂",
    }));

    if (recent.length > 0) {
      base.unshift({ key: RECENT_KEY, label: "Đã dùng gần đây", icon: "🕒" });
    }

    return base;
  }, [recent.length]);

  function handleSelect(char) {
    setRecent(pushRecentEmoji(char));
    onSelect?.(char);
  }

  // Click tab → scroll mượt đến section tương ứng.
  function scrollToTab(tabKey) {
    setActiveTab(tabKey);
    const section = sectionRefs.current[tabKey];
    const container = scrollRef.current;

    if (section && container) {
      // Dùng offsetTop của section so với container vì sticky header có thể làm lệch.
      container.scrollTo({
        top: section.offsetTop - container.offsetTop,
        behavior: "smooth",
      });
    }
  }

  // Khi cuộn → tự động cập nhật activeTab dựa trên section đang nhìn thấy.
  useEffect(() => {
    if (searchResults) return undefined;

    const container = scrollRef.current;
    if (!container) return undefined;

    function handleScroll() {
      // Section nào có top gần đầu container nhất sẽ là active.
      const containerTop = container.getBoundingClientRect().top;
      let currentKey = tabs[0]?.key;
      let smallestDistance = Infinity;

      for (const tab of tabs) {
        const section = sectionRefs.current[tab.key];
        if (!section) continue;

        const sectionTop = section.getBoundingClientRect().top;
        // Đã cuộn qua section này một chút (dưới đầu container 8px).
        const distance = sectionTop - containerTop - 8;

        if (distance <= 0 && Math.abs(distance) < smallestDistance) {
          smallestDistance = Math.abs(distance);
          currentKey = tab.key;
        }
      }

      if (currentKey) {
        setActiveTab(currentKey);
      }
    }

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [tabs, searchResults]);

  // Khi đổi từ search về danh sách thường, reset scroll về đầu.
  useEffect(() => {
    if (!query && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [query]);

  function renderSearchResults() {
    if (!searchResults) return null;

    if (searchResults.length === 0) {
      return (
        <div className="flex h-40 items-center justify-center text-xs text-white/45">
          Không tìm thấy emoji phù hợp.
        </div>
      );
    }

    return (
      <div className="px-3 py-2.5">
        <div className="mb-2 text-[11px] font-semibold uppercase text-white/45">
          Kết quả ({searchResults.length})
        </div>
        <EmojiGrid emojis={searchResults} onSelect={handleSelect} />
      </div>
    );
  }

  function renderAllSections() {
    if (searchResults) return null;

    return (
      <div className="pb-2">
        {recent.length > 0 && (
          <Section
            id={RECENT_KEY}
            label="Đã dùng gần đây"
            icon={<Clock className="h-3 w-3" />}
            sectionRef={(node) => {
              sectionRefs.current[RECENT_KEY] = node;
            }}
          >
            <EmojiGrid
              emojis={recent.map((char) => ({ char, keywords: "" }))}
              onSelect={handleSelect}
            />
          </Section>
        )}

        {EMOJI_GROUPS.map((group) => (
          <Section
            key={group.key}
            id={group.key}
            label={group.label}
            sectionRef={(node) => {
              sectionRefs.current[group.key] = node;
            }}
          >
            <EmojiGrid emojis={group.emojis} onSelect={handleSelect} />
          </Section>
        ))}
      </div>
    );
  }

  return (
    <div className="absolute bottom-14 right-0 z-50 w-80 overflow-hidden rounded-2xl border border-white/10 bg-[#121b25] shadow-2xl">
      <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2.5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm emoji..."
            className="w-full rounded-lg border border-white/10 bg-white/5 py-1.5 pl-8 pr-2 text-xs text-white placeholder:text-white/35 outline-none transition focus:border-white/25 focus:bg-white/10"
          />
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/55 transition hover:bg-white/10 hover:text-white"
            title="Đóng"
            aria-label="Đóng"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {!query && (
        <div className="flex items-center gap-0.5 overflow-x-auto border-b border-white/8 px-2 py-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => scrollToTab(tab.key)}
              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-base transition ${
                activeTab === tab.key
                  ? "bg-white/12 text-white"
                  : "text-white/55 hover:bg-white/8 hover:text-white"
              }`}
              title={tab.label}
              aria-label={tab.label}
            >
              {tab.icon}
            </button>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="max-h-72 overflow-y-auto">
        {renderSearchResults()}
        {renderAllSections()}
      </div>
    </div>
  );
}

function Section({ id, label, icon, sectionRef, children }) {
  return (
    <div ref={sectionRef} data-section={id} className="px-3 pt-2.5">
      <div className="sticky top-0 z-10 mb-2 flex items-center gap-1.5 bg-[#121b25] py-1 text-[11px] font-semibold uppercase text-white/45">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

function EmojiGrid({ emojis, onSelect }) {
  return (
    <div className="grid grid-cols-8 gap-1">
      {emojis.map((emoji, index) => (
        <button
          key={`${emoji.char}-${index}`}
          type="button"
          onClick={() => onSelect(emoji.char)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-lg transition hover:scale-110 hover:bg-white/12"
          title={emoji.keywords || emoji.char}
        >
          {emoji.char}
        </button>
      ))}
    </div>
  );
}
