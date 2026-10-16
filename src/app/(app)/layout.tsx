import { SiteHeader } from "@/components/layout/site-header";

/** Authenticated workspace: header only, no marketing footer. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
    </>
  );
}
