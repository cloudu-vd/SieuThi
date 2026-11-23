// Tiện ích dùng chung: lỗi HTTP, kiểm tra chuỗi, ngày giờ, mã hóa mật khẩu, ghi log lỗi
const crypto = require('crypto'), fs = require('fs'), path = require('path');

class HttpError extends Error {
  constructor(status, message, extra = {}) { super(message); this.status = status; this.extra = extra; }
}
const bad = (m, extra) => new HttpError(400, m, extra);
const notFound = m => new HttpError(404, m);
const str = v => (typeof v === 'string' ? v.trim() : '');
const num = v => (v === '' || v == null ? NaN : Number(v));
const tzfix = ms => new Date(ms - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const today = () => tzfix(Date.now());
const addDays = n => tzfix(Date.now() + n * 864e5);
const now = () => new Date().toISOString();
const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 32).toString('hex');
const newSalt = () => crypto.randomBytes(8).toString('hex');
const newToken = () => crypto.randomBytes(24).toString('hex');
// "Lỗi hệ thống: thông báo và ghi nhận lỗi" (kịch bản tổng quát)
const logError = e => { try { fs.mkdirSync(path.join(__dirname, '..', 'data'), { recursive: true }); fs.appendFileSync(path.join(__dirname, '..', 'data', 'error.log'), `[${now()}] ${e.stack || e}\n`); } catch {} };

module.exports = { HttpError, bad, notFound, str, num, today, addDays, now, hashPw, newSalt, newToken, logError };
