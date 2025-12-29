import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import env from './lib/env';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Create Supabase client
  const supabase = createServerClient(
    env.supabase.url,
    env.supabase.anonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Check authentication for protected routes
  const { data: { user } } = await supabase.auth.getUser();

  // Protect /dashboard/* routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Protect /admin/* routes - require admin role
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    const isAdmin =
      userData?.is_active &&
      (userData?.role === 'admin' || userData?.role === 'super_admin');

    if (!isAdmin) {
      // Redirect non-admin users to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Protect /api/admin/* API routes
  if (request.nextUrl.pathname.startsWith('/api/admin')) {
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    const isAdmin =
      userData?.is_active &&
      (userData?.role === 'admin' || userData?.role === 'super_admin');

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};
