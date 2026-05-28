import { useEffect, useState } from "react";

const INTERACTIVE_SELECTOR = [
  "button:not(:disabled)",
  "a[href]",
  "input",
  "select",
  "textarea",
  "[data-interactive]",
].join(",");

export function InteractiveCursor() {
  const [cursor, setCursor] = useState({ x: 0, y: 0, active: false });

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) {
      return undefined;
    }

    let frame = 0;

    function handlePointerMove(event) {
      const target = event.target instanceof Element
        ? event.target.closest(INTERACTIVE_SELECTOR)
        : null;

      if (frame) {
        cancelAnimationFrame(frame);
      }

      frame = requestAnimationFrame(() => {
        setCursor({
          x: event.clientX,
          y: event.clientY,
          active: Boolean(target),
        });
      });
    }

    function handlePointerLeave() {
      setCursor((current) => ({ ...current, active: false }));
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={[
        "pointer-events-none fixed z-[9999] hidden -translate-x-1/2 -translate-y-1/2 transition-[opacity,transform] duration-200 md:block",
        cursor.active ? "scale-100 opacity-100" : "scale-75 opacity-0",
      ].join(" ")}
      style={{ left: cursor.x, top: cursor.y }}
    >
      <div className="relative h-16 w-16 rounded-full border border-white/40 bg-[radial-gradient(circle,rgba(255,255,255,0.28),rgba(133,178,214,0.12)_42%,transparent_70%)] shadow-[0_0_44px_rgba(190,222,255,0.36)] backdrop-blur-sm">
        <span className="absolute left-3 top-2 h-2 w-2 rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.85)]" />
        <span className="absolute bottom-3 right-4 h-1.5 w-1.5 rounded-full bg-white/80 shadow-[0_0_12px_rgba(255,255,255,0.7)]" />
      </div>
    </div>
  );
}
