import { LogoMark } from "@/components/brand/logo";
import { siteConfig } from "@/config/site";

/**
 * Brand intro shown on a full page load (first visit or refresh). Pure CSS:
 * it plays before JavaScript loads, never blocks clicks (pointer-events: none),
 * hides itself after ~2 seconds and is removed entirely for reduced motion.
 * Client-side navigations keep the root layout mounted, so it doesn't replay.
 */
export function Intro() {
  return (
    <div className="intro" aria-hidden="true">
      <div className="intro__stage">
        <LogoMark className="intro__mark size-12 sm:size-14" />
        <span className="intro__word">
          {Array.from(siteConfig.name).map((ch, i) => (
            <span key={i} className="intro__letter" style={{ "--i": i } as React.CSSProperties}>
              {ch === " " ? " " : ch}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
