// Máy chủ HTTP (Node.js thuần, không cần cài thư viện): phục vụ API /api/* và giao diện trong /public
const http = require('http'), fs = require('fs'), path = require('path');
const dispatch = require('./src/routes');
const { HttpError, logError } = require('./src/util');
const PORT = process.env.PORT || 3000, PUB = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const send = (res, code, type, body) => { res.writeHead(code, { 'Content-Type': type }); res.end(body); };
const readBody = req => new Promise((ok, no) => {
  let s = ''; req.on('data', c => { s += c; if (s.length > 1e6) { no(new HttpError(413, 'Dữ liệu quá lớn')); req.destroy(); } });
  req.on('end', () => { try { ok(s ? JSON.parse(s) : {}); } catch { no(new HttpError(400, 'JSON không hợp lệ')); } });
});
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) {
    try {
      const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readBody(req) : {};
      const out = await dispatch(req, url.pathname, Object.fromEntries(url.searchParams), body, (req.headers.authorization || '').replace('Bearer ', ''));
      if (out && out.__html) return send(res, 200, 'text/html; charset=utf-8', out.__html);
      send(res, 200, 'application/json; charset=utf-8', JSON.stringify(out));
    } catch (e) {
      const status = e.status || 500; if (status === 500) { console.error(e); logError(e); }   // lỗi hệ thống: thông báo và ghi log
      send(res, status, 'application/json; charset=utf-8', JSON.stringify({ message: status === 500 ? 'Lỗi hệ thống, vui lòng thử lại (đã ghi nhận lỗi)' : e.message, ...(e.extra || {}) }));
    }
    return;
  }
  const file = path.normalize(path.join(PUB, url.pathname === '/' ? 'index.html' : url.pathname));
  if (!file.startsWith(PUB) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(res, 404, 'text/plain', 'Not found');
  send(res, 200, MIME[path.extname(file)] || 'application/octet-stream', fs.readFileSync(file));
}).listen(PORT, () => console.log(`Hệ thống quản lý siêu thị chạy tại http://localhost:${PORT}`));
