import { useEffect, useState } from "react";
import { fetchHeadlines } from "@/lib/mirror/rpc";
import type { NewsItem } from "@/lib/mirror/types";

export function NewsRail({ initial = [] }: { initial?: NewsItem[] }) {
  const [items, setItems] = useState<NewsItem[]>(initial);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void fetchHeadlines()
        .then((rows) => {
          if (!cancelled && rows.length) setItems(rows);
        })
        .catch(() => {
          /* keep initial */
        });
    };
    if (!initial.length) load();
    const id = window.setInterval(load, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [initial.length]);

  if (!items.length) return null;

  return (
    <div className="max-w-md min-w-0">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
        Headlines
      </p>
      <ul className="mt-3 space-y-2">
        {items.slice(0, 4).map((item) => (
          <li
            key={item.title}
            className="text-sm font-light leading-snug text-fg/80"
          >
            {item.title}
          </li>
        ))}
      </ul>
    </div>
  );
}
