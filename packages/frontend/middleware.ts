import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = new Set(["/", "/privacy", "/terms"]);

// 不拦截静态资源、API 代理和内部 Next.js 路由
const INTERNAL_PREFIX = /^\/(_next|api|favicon)/;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 放行公开路由
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // 放行静态资源、API 代理（/api/* 转发到后端）、内部路由
  if (INTERNAL_PREFIX.test(pathname)) {
    return NextResponse.next();
  }

  // 检查 auth_token cookie
  const token = req.cookies.get("auth_token")?.value;
  if (!token) {
    const loginUrl = new URL("/", req.url);
    // no-store：防止 Next.js 路由缓存缓存此重定向（Link 预取会把未登录时的
    // 重定向结果缓存进 router cache，导致登录后 router.push 命中缓存留在首页）
    const res = NextResponse.redirect(loginUrl);
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
