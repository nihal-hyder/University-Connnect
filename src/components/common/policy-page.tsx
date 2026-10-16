/** Long-form document layout for policies and guidelines. */
export function PolicyPage({
  eyebrow,
  title,
  updated,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  intro: React.ReactNode;
  sections: { id: string; title: string; body: React.ReactNode }[];
}) {
  return (
    <div className="page-container py-12 md:py-16">
      <div className="grid gap-12 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label="On this page" className="hidden lg:block">
          <div className="sticky top-24">
            <p className="eyebrow">On this page</p>
            <ul className="mt-3 space-y-2 text-sm">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-foreground/70 hover:text-foreground">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
        <article className="max-w-prose">
          <p className="eyebrow text-signal-ink">{eyebrow}</p>
          <h1 className="mt-2 font-display text-headline">{title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated {updated}</p>
          <div className="prose-body mt-8">{intro}</div>
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="mt-10 scroll-mt-24">
              <h2 className="font-display text-2xl">{s.title}</h2>
              <div className="prose-body mt-3 [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5">{s.body}</div>
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
