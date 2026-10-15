import { Download, X, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already running in standalone display mode
    const inStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    if (inStandaloneMode) {
      setIsStandalone(true);
      return;
    }

    // Check if user previously dismissed the prompt within 7 days
    const dismissedAt = localStorage.getItem("fixio_pwa_dismissed");
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Fallback timer: Show install guidance after 3 seconds if not in standalone
    const fallbackTimer = setTimeout(() => {
      if (!inStandaloneMode && !dismissedAt) {
        setIsVisible(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      clearTimeout(fallbackTimer);
    };
  }, []);

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        toast.success("Fixio installed as a web application!");
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    } else {
      // Fallback instructions for browsers without direct prompt API (e.g., iOS Safari or Chrome Desktop)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        toast.info(
          "To install Fixio on iOS: tap the Share button in Safari, then select 'Add to Home Screen'.",
          { duration: 6000 },
        );
      } else {
        toast.info(
          "To install Fixio: open your browser menu (⋮ or ⋯) and click 'Install Fixio' or 'Add to Home screen'.",
          { duration: 6000 },
        );
      }
      setIsVisible(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem("fixio_pwa_dismissed", Date.now().toString());
    setIsVisible(false);
  }

  if (isStandalone || !isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-16 left-4 right-4 z-50 mx-auto max-w-sm md:bottom-6 md:left-auto md:right-6 animate-scale-in">
      <div className="card-3d relative flex items-center gap-3.5 rounded-2xl border border-brand/30 bg-card/95 p-4 shadow-elevated backdrop-blur-md">
        <div className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-brand-foreground font-display text-lg font-bold shadow-sm">
          F
          <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-background text-brand">
            <Smartphone className="size-2.5" />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold tracking-tight text-foreground">
            Install Fixio Web App
          </p>
          <p className="line-clamp-2 text-xs text-muted-foreground mt-0.5">
            Get fast, instant desktop & mobile home screen access.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => void handleInstall()}
            className="btn-tactile-brand flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-2 text-xs font-semibold text-brand-foreground shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Download className="size-3.5" />
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer"
            aria-label="Dismiss install prompt"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
