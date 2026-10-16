import { devMailboxUrl } from "@/lib/env/public";

/** Development-only hint: local auth emails land in the test inbox, not Gmail. */
export function DevMailboxNote() {
  if (!devMailboxUrl) return null;
  return (
    <p className="mt-4 rounded-lg border border-dashed border-warning/40 bg-warning-soft px-3 py-2 text-[13px] leading-5 text-warning">
      Local development: emails are not delivered to real inboxes. Open the{" "}
      <a href={devMailboxUrl} target="_blank" rel="noopener noreferrer" className="font-medium underline">
        test inbox
      </a>{" "}
      to find this message.
    </p>
  );
}
