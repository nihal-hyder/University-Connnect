"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, CameraOff, CheckCircle2, Loader2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkInByCode, type CheckInResult } from "@/lib/actions/events";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type Detector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> };
declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => Detector;
  }
}

const noopSubscribe = () => () => {};

const COPY: Record<CheckInResult["result"], { title: string; tone: "ok" | "warn" | "bad" }> = {
  checked_in: { title: "Checked in", tone: "ok" },
  already_checked_in: { title: "Already checked in", tone: "warn" },
  not_eligible: { title: "Not eligible for entry", tone: "bad" },
  wrong_event: { title: "Ticket is for a different event", tone: "bad" },
  invalid: { title: "Ticket not recognised", tone: "bad" },
  undone: { title: "Check-in removed", tone: "warn" },
};

/**
 * Scans QR tickets with the device camera (BarcodeDetector, where the browser
 * supports it) or accepts a typed code. Every scan is authorised and
 * de-duplicated by the database; the QR holds only a random ticket code.
 */
export function CheckInScanner({ eventId }: { eventId: string }) {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const lastCode = useRef<{ code: string; at: number } | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => "BarcodeDetector" in window && Boolean(navigator.mediaDevices),
    () => null,
  );
  const [code, setCode] = useState("");
  const [result, setResult] = useState<(CheckInResult & { error?: string }) | null>(null);
  const [pending, start] = useTransition();

  const submit = useCallback(
    (value: string) => {
      const clean = value.trim();
      if (!clean) return;
      start(async () => {
        const res = await checkInByCode(eventId, clean);
        if (!res.ok) setResult({ result: "invalid", error: res.error });
        else {
          setResult(res.data);
          if (res.data.result === "checked_in") {
            setCode("");
            router.refresh();
          }
        }
      });
    },
    [eventId, router],
  );

  const stop = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setCameraOn(false);
  }, []);

  useEffect(() => stop, [stop]);

  useEffect(() => {
    if (!cameraOn || !window.BarcodeDetector) return;
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    let raf = 0;
    let cancelled = false;
    const tick = async () => {
      if (cancelled || !video.current) return;
      if (video.current.readyState >= 2) {
        try {
          const found = await detector.detect(video.current);
          const value = found[0]?.rawValue;
          const now = Date.now();
          // Ignore the same code for 4 seconds so one ticket isn't scanned repeatedly.
          if (value && !(lastCode.current?.code === value && now - lastCode.current.at < 4000)) {
            lastCode.current = { code: value, at: now };
            submit(value);
          }
        } catch {
          /* frame not ready */
        }
      }
      raf = window.setTimeout(() => void tick(), 250) as unknown as number;
    };
    void tick();
    return () => {
      cancelled = true;
      window.clearTimeout(raf);
    };
  }, [cameraOn, submit]);

  async function startCamera() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      stream.current = s;
      setCameraOn(true);
      requestAnimationFrame(() => {
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play();
        }
      });
    } catch {
      setResult({ result: "invalid", error: "Camera access was blocked. Allow the camera in your browser settings, or type the ticket code." });
    }
  }

  const copy = result ? COPY[result.result] : null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-neutral-900">
          {cameraOn ? (
            <video ref={video} className="size-full object-cover" playsInline muted aria-label="Camera preview" />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-3 p-6 text-center text-neutral-200">
              <Camera className="size-8" aria-hidden />
              <p className="max-w-xs text-sm">
                {supported === false ? "This browser can't scan QR codes. Type the code from the ticket instead." : "Start the camera and point it at a ticket's QR code."}
              </p>
            </div>
          )}
          {cameraOn ? <div className="pointer-events-none absolute inset-[18%] rounded-lg border-2 border-white/70" aria-hidden /> : null}
        </div>
        {supported ? (
          cameraOn ? (
            <Button type="button" variant="outline" onClick={stop}>
              <CameraOff /> Stop camera
            </Button>
          ) : (
            <Button type="button" onClick={startCamera}>
              <Camera /> Start camera
            </Button>
          )
        ) : null}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(code);
          }}
          className="space-y-1.5"
        >
          <Label htmlFor="ticket-code">Ticket code</Label>
          <div className="flex gap-2">
            <Input id="ticket-code" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" className="font-mono" placeholder="Paste or type the code" />
            <Button type="submit" disabled={pending || !code.trim()}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              Check in
            </Button>
          </div>
        </form>
      </div>

      <div aria-live="assertive" role="status">
        {result && copy ? (
          <div
            className={cn(
              "flex h-full min-h-48 flex-col items-center justify-center rounded-xl border p-8 text-center",
              copy.tone === "ok" && "border-success/30 bg-success-soft text-success",
              copy.tone === "warn" && "border-warning/30 bg-warning-soft text-warning",
              copy.tone === "bad" && "border-destructive/30 bg-destructive/5 text-destructive",
            )}
          >
            {copy.tone === "ok" ? <CheckCircle2 className="size-12" aria-hidden /> : copy.tone === "warn" ? <AlertTriangle className="size-12" aria-hidden /> : <XCircle className="size-12" aria-hidden />}
            <p className="mt-4 font-display text-3xl">{copy.title}</p>
            {result.name ? <p className="mt-2 text-lg text-foreground">{result.name}</p> : null}
            {result.reference ? <p className="font-mono text-sm text-foreground/70">{result.reference}</p> : null}
            {result.checked_in_at && result.result === "already_checked_in" ? (
              <p className="mt-2 text-sm text-foreground/80">First checked in at {formatTime(result.checked_in_at)}</p>
            ) : null}
            {result.status && result.result === "not_eligible" ? <p className="mt-2 text-sm text-foreground/80">Registration status: {result.status}</p> : null}
            {result.error ? <p className="mt-2 max-w-sm text-sm text-foreground/80">{result.error}</p> : null}
          </div>
        ) : (
          <div className="flex h-full min-h-48 items-center justify-center rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Scan results appear here.
          </div>
        )}
      </div>
    </div>
  );
}
