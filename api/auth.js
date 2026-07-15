export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    if (url.pathname === '/api/auth/login' && request.method === 'POST') {
        const body = await request.json();
        const { username, password } = body;

        if (username === env.ADMIN_USERNAME && password === env.ADMIN_PASSWORD) {
            const token = btoa(JSON.stringify({
                username,
                expires: Date.now() + 86400000
            }));

            return new Response(JSON.stringify({ success: true, token }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Set-Cookie': `admin_token=${token}; HttpOnly; Secure; Path=/; Max-Age=86400`
                }
            });
        }

        return new Response(JSON.stringify({ success: false, error: 'Username atau password salah' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (url.pathname === '/api/auth/logout') {
        return new Response(JSON.stringify({ success: true }), {
            headers: {
                'Content-Type': 'application/json',
                'Set-Cookie': 'admin_token=; HttpOnly; Secure; Path=/; Max-Age=0'
            }
        });
    }

    if (url.pathname === '/api/auth/status') {
        const cookie = request.headers.get('Cookie') || '';
        const token = cookie.split(';').find(c => c.trim().startsWith('admin_token='));

        if (token) {
            try {
                const value = token.split('=')[1];
                const data = JSON.parse(atob(value));
                if (data.expires > Date.now()) {
                    return new Response(JSON.stringify({ authenticated: true }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            } catch (e) {}
        }

        return new Response(JSON.stringify({ authenticated: false }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response('Not found', { status: 404 });
}