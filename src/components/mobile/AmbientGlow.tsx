import * as React from "react";

import { cn } from "@/lib/utils";

type AmbientGlowProps = {
  className?: string;
};

/**
 * Signature moment: a subtle, premium "light field" that follows the pointer.
 * Respects prefers-reduced-motion.
 */
export function AmbientGlow({ className }: AmbientGlowProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = React.useState({ x: 55, y: 12 });

  React.useEffect(() => {
    const root = ref.current?.parentElement;
    if (!root) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) return;

    let raf = 0;

    const onMove = (e: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setPos({ x, y }));
    };

    root.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      root.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      <div
        className="absolute -inset-24 bg-hero opacity-90"
        style={{
          transform: `translate3d(${pos.x - 50}%, ${pos.y - 50}%, 0)`,
          transition: "transform 900ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      />
    </div>
  );
}
