/** Re-mounts on every navigation, so each new page eases in (see .page-enter). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
