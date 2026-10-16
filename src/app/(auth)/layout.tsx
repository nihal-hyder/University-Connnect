import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <svg className="pointer-events-none absolute inset-0 size-full opacity-[0.12]" aria-hidden="true">
          <defs>
            <pattern id="auth-jaali" width="44" height="44" patternUnits="userSpaceOnUse">
              <path d="M22 2 L42 22 L22 42 L2 22 Z" fill="none" stroke="currentColor" strokeWidth="1" />
              <circle cx="22" cy="22" r="3" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#auth-jaali)" />
        </svg>
        <Link href="/" className="relative font-display text-2xl">CampusConnect</Link>
        <div className="relative max-w-md">
          <p className="font-display text-4xl leading-tight">One account for every event, registration and volunteer role.</p>
          <p className="mt-4 text-primary-foreground/75">
            Students use the same account to join societies, apply for roles and, later, to run events of their own.
          </p>
        </div>
        <p className="relative text-sm text-primary-foreground/60">Free for students and societies.</p>
      </aside>
      <main id="main" className="flex flex-col px-4 py-8 sm:px-10">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
