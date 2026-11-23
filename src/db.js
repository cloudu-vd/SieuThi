// "CSDL": mỗi lớp thực thể trong biểu đồ lớp là một bảng (mảng) trong file data/db.json.
const fs = require('fs'), path = require('path');
const FILE = path.join(__dirname, '..', 'data', 'db.json');
let data = null;

function save() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE + '.tmp', JSON.stringify(data, null, 2));
  fs.renameSync(FILE + '.tmp', FILE);
}
function db() {
  if (!data) {
    if (fs.existsSync(FILE)) data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    else { data = require('./seed')(); save(); }
  }
  return data;
}
// Giao dịch: lỗi giữa chừng thì khôi phục dữ liệu cũ ("dữ liệu chưa được lưu được hủy bỏ")
function transaction(fn) {
  const backup = JSON.stringify(db());
  try { const r = fn(data); save(); return r; } catch (e) { data = JSON.parse(backup); throw e; }
}
function nextCode(prefix, pad = 4) {
  const d = db(); d.counters[prefix] = (d.counters[prefix] || 0) + 1;
  return prefix + String(d.counters[prefix]).padStart(pad, '0');
}
module.exports = { db, save, transaction, nextCode };
