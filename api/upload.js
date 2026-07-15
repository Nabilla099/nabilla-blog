export async function onRequest(context) {
    const { request, env } = context;

    const cookie = request.headers.get('Cookie') || '';
    const token = cookie.split(';').find(c => c.trim().startsWith('admin_token='));
    if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const value = token.split('=')[1];
        const data = JSON.parse(atob(value));
        if (data.expires < Date.now()) {
            return new Response(JSON.stringify({ error: 'Session expired' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid session' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('image');

        if (!file) {
            return new Response(JSON.stringify({ error: 'Tidak ada file' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            return new Response(JSON.stringify({ error: 'Format tidak didukung' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (file.size > 5 * 1024 * 1024) {
            return new Response(JSON.stringify({ error: 'File maksimal 5MB' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const ext = file.name.split('.').pop();
        const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

        const arrayBuffer = await file.arrayBuffer();
        await env.BLOG_IMAGES.put(filename, arrayBuffer, {
            httpMetadata: {
                contentType: file.type,
                cacheControl: 'public, max-age=31536000'
            }
        });

        const url = `https://${env.BLOG_IMAGES.bucketName}.r2.dev/${filename}`;

        return new Response(JSON.stringify({ success: true, url }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e) {
        return new Response(JSON.stringify({ error: 'Gagal upload: ' + e.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}