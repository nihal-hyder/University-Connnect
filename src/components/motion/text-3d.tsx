type Segment = { text: string; className?: string; as?: "em" | "span" };

/**
 * Headline built from individual 3D letters. At rest it reads as clean type;
 * hovering a letter pops it forward with an extruded edge and a colour change,
 * and its neighbours lift slightly. Pure CSS (see .letter-3d in globals.css),
 * so it works before JavaScript loads and costs nothing at runtime.
 *
 * Accessibility: the sentence is in a visually hidden span and the letter
 * spans are aria-hidden, so screen readers and search engines read one normal
 * heading rather than individual characters.
 */
export function Text3D({ segments, className }: { segments: Segment[]; className?: string }) {
  const full = segments.map((s) => s.text).join("");
  let index = 0;

  return (
    // Plain concatenation: the class merger would treat the custom `text-display` size as a colour and drop it.
    <h1 className={className ? `text-3d ${className}` : "text-3d"}>
      <span className="sr-only">{full}</span>
      {/* Entrance delay comes from CSS: html:not([data-intro-done]) waits for the intro. */}
      <span aria-hidden="true" className="text-3d__inner">
        {segments.map((seg, si) => {
          const Tag = seg.as ?? "span";
          return (
            <Tag key={si} className={seg.className}>
              {seg.text.split(/(\s+)/).map((word, wi) => {
                if (!word) return null;
                if (/^\s+$/.test(word)) return " ";
                // Each word stays on one line; its letters move individually.
                return (
                  <span key={wi} className="text-3d__word">
                    {Array.from(word).map((ch, ci) => (
                      <span key={ci} className="letter-3d" style={{ "--i": index++ } as React.CSSProperties}>
                        {ch}
                      </span>
                    ))}
                  </span>
                );
              })}
            </Tag>
          );
        })}
      </span>
    </h1>
  );
}
