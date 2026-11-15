import { MediaItem } from "@/lib/types";

interface Props {
  items: MediaItem[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}

const fmt = (s?: number | null) =>
  s ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "";

export default function VideoGrid({ items, selected, onToggle }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      {items.map((it) => {
        const on = selected.has(it.id);
        return (
          <button key={it.id} onClick={() => onToggle(it.id)}
            className={`overflow-hidden rounded-xl border bg-zinc-900 text-left transition ${
              on ? "border-violet-500 ring-2 ring-violet-500/50" : "border-zinc-800 hover:border-zinc-600"}`}>
            <div className="relative aspect-video bg-zinc-800">
              {it.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.thumbnail} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
              )}
              {it.duration ? (
                <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 text-xs">{fmt(it.duration)}</span>
              ) : null}
              <span className={`absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
                on ? "border-violet-500 bg-violet-500" : "border-zinc-400 bg-black/50"}`}>
                {on ? "✓" : ""}
              </span>
            </div>
            <p className="line-clamp-2 p-3 text-sm">{it.title}</p>
          </button>
        );
      })}
    </div>
  );
}
