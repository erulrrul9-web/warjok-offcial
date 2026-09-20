const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint FakeFF (satu orang)
app.get('/api/fakeff', async (req, res) => {
    const nickname = req.query.nickname;
    if (!nickname) return res.status(400).json({ error: 'Nickname wajib diisi' });

    try {
        const apiUrl = `https://api.nexray.eu.cc/maker/fakelobyff?nickname=${encodeURIComponent(nickname)}`;
        const response = await axios.get(apiUrl, {
            responseType: 'arraybuffer',
            timeout: 60000,
            validateStatus: () => true,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });

        const mime = response.headers['content-type'] || '';

        // Kalau API balikin JSON, ambil URL gambarnya dulu
        if (mime.includes('application/json') || response.status >= 400) {
            let json;
            try {
                json = JSON.parse(Buffer.from(response.data).toString('utf8'));
            } catch {
                return res.status(500).json({ error: `API error HTTP ${response.status}` });
            }
            if (json && json.status === false) {
                return res.status(500).json({ error: json.message || json.error || 'API error' });
            }
            const mediaUrl = json?.result || json?.url || json?.data;
            if (!mediaUrl) return res.status(500).json({ error: 'Media URL tidak ditemukan' });

            const mediaRes = await axios.get(mediaUrl, {
                responseType: 'arraybuffer',
                timeout: 30000,
                validateStatus: () => true
            });
            if (mediaRes.status >= 400) {
                return res.status(500).json({ error: `Gagal unduh hasil (HTTP ${mediaRes.status})` });
            }
            res.set('Content-Type', 'image/png');
            return res.send(Buffer.from(mediaRes.data));
        }

        // Kalau API langsung balikin gambar
        res.set('Content-Type', mime || 'image/png');
        res.send(Buffer.from(response.data));

    } catch (e) {
        console.error('FakeFF error:', e.message);
        res.status(500).json({ error: e.message || 'Gagal membuat FakeFF' });
    }
});

// Endpoint FakeFF Duo (dua orang)
app.get('/api/fakeffduo', async (req, res) => {
    const { username1, username2 } = req.query;
    if (!username1 || !username2) {
        return res.status(400).json({ error: 'Username1 dan Username2 wajib diisi' });
    }

    try {
        const apiUrl = `https://api.snowping.cfd/api/maker/fakeffDuo?username1=${encodeURIComponent(username1)}&username2=${encodeURIComponent(username2)}`;
        const response = await axios.get(apiUrl, { timeout: 60000 });
        const resData = response.data;

        let imageUrl = resData?.result?.url || resData?.result || resData?.url || resData?.data?.url || resData?.data;
        if (typeof imageUrl === 'object' && imageUrl?.url) imageUrl = imageUrl.url;
        if (!imageUrl || typeof imageUrl !== 'string') {
            throw new Error(resData?.message || resData?.error || 'Gagal mendapatkan respon gambar dari server');
        }

        imageUrl = imageUrl.trim();
        if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
            imageUrl = imageUrl.startsWith('/')
                ? `https://api.snowping.cfd${imageUrl}`
                : `https://api.snowping.cfd/${imageUrl}`;
        }

        const imageRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        res.set('Content-Type', 'image/png');
        res.send(Buffer.from(imageRes.data));

    } catch (err) {
        console.error('FakeFF Duo error:', err.message);
        let errMsg = err.message;
        if (err.response && err.response.data) {
            try {
                const errJson = JSON.parse(Buffer.from(err.response.data).toString('utf8'));
                errMsg = errJson.message || errJson.error || errMsg;
            } catch {}
        }
        res.status(500).json({ error: errMsg });
    }
});

module.exports = app;