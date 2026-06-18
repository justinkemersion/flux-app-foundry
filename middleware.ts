import { auth } from "@/auth";

export default auth;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|svg|webp)$).*)",
  ],
};
