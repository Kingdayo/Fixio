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
      <div className="relative grid size-20 place-items-center">
        {/* Glowing bubbly background aura */}
        <div className="absolute inset-0 rounded-full bg-brand/30 blur-md animate-glow-bubble" />
        {/* Pulsing ring background */}
        <div className="absolute inset-0 rounded-full border-2 border-brand/40 animate-pulse-ring" />
        {/* Floating bubbles */}
        <div className="absolute -top-1 -right-1 size-3 rounded-full bg-brand/80 animate-bubble-float shadow-[0_0_10px_oklch(0.679_0.2_38)]" />
        <div className="absolute -bottom-1 -left-1 size-2.5 rounded-full bg-info/80 animate-bubble-float shadow-[0_0_8px_oklch(0.573_0.213_264)] [animation-delay:-2s]" />
        {/* Orbiting indicator */}
        <div className="absolute size-full animate-orbit-quill">
          <div className="size-4 rounded-full bg-brand shadow-[0_0_16px_oklch(0.679_0.2_38)]" />
        </div>
        {/* Core F badge */}
        <div className="relative grid size-11 place-items-center rounded-2xl bg-brand font-display text-xl font-bold text-brand-foreground shadow-lg animate-bounce">
          F
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
