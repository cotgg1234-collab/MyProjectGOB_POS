"use client";

/** Product thumbnail with a text fallback for items that have no photo yet. */
export default function ProductImage({
  src,
  name,
  className = "",
}: {
  src: string | null | undefined;
  name: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div className={`grid place-items-center bg-surface-2 text-muted ${className}`}>
        <span className="text-2xl font-bold opacity-40">{name.slice(0, 1)}</span>
      </div>
    );
  }
  // Uploads are local files with unpredictable dimensions — a plain <img> keeps this simple.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={name} className={`object-cover ${className}`} />;
}
