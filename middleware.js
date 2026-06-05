import { NextResponse } from 'next/server';

export function middleware(request) {
    const { pathname } = request.nextUrl;
    
    // Ignore static files and images
    if (pathname.includes('.') || pathname.startsWith('/_next/')) {
        return NextResponse.next();
    }

    const userRole = request.cookies.get('user_role')?.value;

    // Restrict guest access
    if (userRole === 'guest') {
        const allowedPaths = ['/scada', '/ai-chat', '/login', '/api/chat'];
        
        const isAllowed = allowedPaths.some(path => pathname === path || pathname.startsWith(path + '/'));

        if (!isAllowed) {
            return NextResponse.redirect(new URL('/scada', request.url));
        }
    }

    return NextResponse.next();
}
