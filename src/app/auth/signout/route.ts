import { NextResponse, type NextRequest } from "next/server";
import { isSameOrigin } from "@/lib/auth/same-origin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
  const response = NextResponse.redirect(new URL("/", request.url), { status: 303 });
  // Asks the browser to drop cached responses. Offline ticket copies are also
  // deleted by the page before it submits (clearPrivateCaches), which covers
  // browsers that don't apply this header to Cache Storage.
  response.headers.set("Clear-Site-Data", '"cache"');
  return response;
}
