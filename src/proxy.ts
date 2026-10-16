import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static assets, images, the job endpoint and webhooks
    // (each authenticates with its own secret).
    "/((?!_next/static|_next/image|favicon.ico|api/jobs|api/webhooks|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
