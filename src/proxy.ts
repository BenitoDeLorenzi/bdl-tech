import { NextResponse, type NextRequest } from "next/server";

const subdomainRoutes: Record<string, string> = {
  "frotaspublicas.bdltech.com.br": "/frotas",
};

export function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0];
  const modulePath = host ? subdomainRoutes[host] : undefined;

  if (!modulePath) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();

  if (url.pathname === "/" || url.pathname === modulePath) {
    url.pathname = modulePath;
    return NextResponse.rewrite(url);
  }

  if (!url.pathname.startsWith(modulePath)) {
    url.pathname = `${modulePath}${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|.*\\..*).*)"],
};
