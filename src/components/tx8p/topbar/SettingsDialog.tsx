import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useUiStore } from "@/state/uiStore";

export function SettingsDialog() {
  const open = useUiStore((s) => s.settingsOpen);
  const setOpen = useUiStore((s) => s.setSettingsOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="max-w-md border-0 p-0"
        style={{
          background:
            "linear-gradient(180deg, var(--chassis-highlight-top) 0%, var(--chassis-base) 100%)",
          color: "var(--engraving-chassis)",
          boxShadow:
            "0 24px 60px -20px oklch(0 0 0 / 0.6), inset 0 1px 0 var(--chassis-edge-light), inset 0 -1px 0 var(--chassis-edge-dark)",
        }}
      >
        <div className="border-b border-black/15 px-5 py-4">
          <DialogHeader>
            <DialogTitle
              className="font-sans"
              style={{
                color: "var(--engraving-chassis)",
                fontSize: 16,
                letterSpacing: "0.10em",
              }}
            >
              SETTINGS
            </DialogTitle>
            <DialogDescription
              style={{ color: "var(--engraving-chassis-dim)" }}
              className="text-xs tracking-wider"
            >
              System, audio and MIDI preferences.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="px-5 py-5">
          <div
            className="rounded-[2px] p-3 font-mono text-[11px]"
            style={{
              background: "var(--panel-strip)",
              color: "var(--engraving-fill)",
              boxShadow: "var(--shadow-strip-inset)",
            }}
          >
            Settings shell — populated in a later milestone.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
