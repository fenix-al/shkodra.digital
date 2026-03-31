import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { defaultPathForRole } from '@/lib/auth/roles'

/** Routes that require no authentication */
const PUBLIC_ROUTES = ['/login', '/regjistrohu', '/verifiko']

/** Maps URL prefixes to the roles allowed to access them */
const PROTECTED_ROUTES = [
  { prefix: '/citizen', roles: ['citizen', 'super_admin'] },
  { prefix: '/police', roles: ['police', 'super_admin'] },
  { prefix: '/admin', roles: ['manager', 'super_admin'] },
]

export async function proxy(request) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request })

  // Instantiate Supabase with cookie forwarding (required for session refresh)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: getUser() — not getSession() — validates the JWT server-side
  const { data: { user } } = await supabase.auth.getUser()

  // Public routes: redirect logged-in users to their dashboard
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      return NextResponse.redirect(
        new URL(defaultPathForRole(profile?.role), request.url)
      )
    }
    return response
  }

  // Root path: redirect to login or dashboard
  if (pathname === '/') {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    return NextResponse.redirect(
      new URL(defaultPathForRole(profile?.role), request.url)
    )
  }

  // Protected routes
  const matchedRoute = PROTECTED_ROUTES.find((r) => pathname.startsWith(r.prefix))
  if (matchedRoute) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !matchedRoute.roles.includes(profile.role)) {
      // Redirect to their own dashboard — do not expose 403
      return NextResponse.redirect(
        new URL(defaultPathForRole(profile?.role ?? 'citizen'), request.url)
      )
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
