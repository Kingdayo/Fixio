export function OrbitalLoader({
  label = "Loading…",
  sublabel,
  className = "",
}: {
  label?: string;
  sublabel?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center animate-scale-in ${className}`}
    >
      <div className="relative grid size-16 place-items-center">
        {/* Pulsing ring background */}
        <div className="absolute inset-0 rounded-full bg-brand/20 animate-pulse-ring" />
        {/* Orbiting indicator */}
        <div className="absolute size-full animate-orbit-quill">
          <div className="size-3.5 rounded-full bg-brand shadow-[0_0_12px_oklch(0.679_0.2_38)]" />
        </div>
        {/* Core Q badge */}
        <div className="relative grid size-10 place-items-center rounded-xl bg-brand font-display text-lg font-bold text-brand-foreground shadow-md animate-bounce">
          Q
        </div>
      </div>

      {label && (
        <p className="mt-4 font-display text-base font-semibold tracking-tight text-foreground">
          {label}
        </p>
      )}
      {sublabel && <p className="mt-1 text-xs text-muted-foreground animate-pulse">{sublabel}</p>}
    </div>
  );
}
