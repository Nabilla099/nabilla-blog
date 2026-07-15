export async function onRequest(context) {
    const { request, next } = context;
    const url = new URL(request.url);

    if (url.pathname.startsWith('/admin/') && url.pathname !== '/admin/login.html') {
        const cookie = request.headers.get('Cookie') || '';
        const token = cookie.split(';').find(c => c.trim().startsWith('admin_token='));

        if (!token) {
            return Response.redirect('/admin/login.html', 302);
        }

        try {
            const value = token.split('=')[1];
            const data = JSON.parse(atob(value));
            if (data.expires < Date.now()) {
                return Response.redirect('/admin/login.html', 302);
            }
        } catch (e) {
            return Response.redirect('/admin/login.html', 302);
        }
    }

    return next();
}