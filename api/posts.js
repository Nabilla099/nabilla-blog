export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/api/posts') {
        try {
            const posts = await env.BLOG_KV.get('posts', 'json') || [];
            return new Response(JSON.stringify(posts), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: 'Gagal mengambil data' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    if (request.method === 'POST') {
        const isAuth = await checkAuth(request, env);
        if (!isAuth) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const body = await request.json();
        const posts = await env.BLOG_KV.get('posts', 'json') || [];
        const slug = slugify(body.title);

        const newPost = {
            id: Date.now(),
            slug,
            title: body.title,
            category: body.category || 'Other',
            description: body.description || '',
            images: body.images || [],
            downloadLink: body.downloadLink || '',
            date: new Date().toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }),
            timestamp: Date.now()
        };

        if (body.id) {
            const index = posts.findIndex(p => p.id === body.id);
            if (index !== -1) {
                posts[index] = { ...posts[index], ...newPost, id: body.id };
            }
        } else {
            posts.push(newPost);
        }

        await env.BLOG_KV.put('posts', JSON.stringify(posts));

        return new Response(JSON.stringify({ success: true, post: newPost }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (request.method === 'DELETE') {
        const isAuth = await checkAuth(request, env);
        if (!isAuth) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const id = parseInt(url.pathname.split('/').pop());
        const posts = await env.BLOG_KV.get('posts', 'json') || [];
        const filtered = posts.filter(p => p.id !== id);

        if (filtered.length === posts.length) {
            return new Response(JSON.stringify({ error: 'Post tidak ditemukan' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        await env.BLOG_KV.put('posts', JSON.stringify(filtered));
        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response('Not found', { status: 404 });
}

function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

async function checkAuth(request, env) {
    const cookie = request.headers.get('Cookie') || '';
    const token = cookie.split(';').find(c => c.trim().startsWith('admin_token='));

    if (!token) return false;

    try {
        const value = token.split('=')[1];
        const data = JSON.parse(atob(value));
        return data.expires > Date.now();
    } catch (e) {
        return false;
    }
}