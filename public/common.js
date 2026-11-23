'use strict';
/* ============ TIỆN ÍCH CHUNG ============ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const vnd = n => Number(n || 0).toLocaleString('vi-VN') + ' ₫';
const fmtD = s => (s ? String(s).slice(0, 10).split('-').reverse().join('/') : '');
const fmtDT = s => (s ? new Date(s).toLocaleString('vi-VN') : '');
let token = localStorage.getItem('token'), user = null;

// Gọi API. Lỗi ném ra Error có .message, .status, .data (data.errors = lỗi theo từng trường)
async function api(method, url, body) {
  const r = await fetch('/api' + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let d; try { d = JSON.parse(t); } catch { d = t; }
  if (!r.ok) { if (r.status === 401 && token) { localStorage.removeItem('token'); token = null; renderLogin(); } const e = new Error(d.message || 'Lỗi'); e.status = r.status; e.data = d; throw e; }
  return d;
}
function toast(msg, type = '') { const d = document.createElement('div'); d.className = type; d.textContent = msg; $('#toast').appendChild(d); setTimeout(() => d.remove(), 3500); }
function modal(title, body, wide) {
  const el = document.createElement('div'); el.className = 'overlay';
  el.innerHTML = `<div class="modal ${wide ? 'wide' : ''}"><div class="mh"><b>${esc(title)}</b><button class="x" data-close>×</button></div><div class="mb">${body}</div></div>`;
  el.onclick = e => { if (e.target === el || e.target.hasAttribute('data-close')) el.remove(); };
  $('#modal-root').appendChild(el); return el;
}
const showErr = (el, errs) => $$('[data-err]', el).forEach(s => s.textContent = errs[s.dataset.err] || '');
const fld = (n, label, type = 'text', v = '', extra = '') => `<label>${label}<input name="${n}" type="${type}" value="${esc(v)}" ${extra}><span class="err" data-err="${n}"></span></label>`;
const sel = (n, label, opts, v = '', extra = '') => `<label>${label}<select name="${n}" ${extra}>${opts.map(o => { const [val, txt] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(txt)}</option>`; }).join('')}</select><span class="err" data-err="${n}"></span></label>`;
const tag = t => `<span class="tag ${/^(Hoạt động|Hiệu lực|Còn hàng|Đang diễn ra|Đã thanh toán|Đã xuất|Đang áp dụng|Đã ghi nhận|Đang kinh doanh|Mở)/.test(t) ? 'ok' : /Hết|Hủy|Ngừng|Tạm khóa|Đã kết thúc|Bị khóa|Khóa/.test(t) ? 'er' : 'wa'}">${esc(t)}</span>`;
const tbl = (heads, rows, empty = 'Không có dữ liệu') => `<div class="tbl"><table><tr>${heads.map(h => `<th class="${h.startsWith('>') ? 'r' : ''}">${esc(h.replace('>', ''))}</th>`).join('')}</tr>${rows.join('') || `<tr><td colspan="${heads.length}" class="note">${empty}</td></tr>`}</table></div>`;
const formData = e => Object.fromEntries(new FormData(e.target));
// Gửi form: thành công -> đóng hộp thoại; lỗi trường -> hiện tại trường, lỗi chung -> toast
async function submitModal(m, fn, okMsg, after) {
  try { const r = await fn(); toast(okMsg); m.remove(); after && after(r); }
  catch (err) { showErr(m, err.data?.errors || {}); if (!err.data?.errors || err.status !== 400) toast(err.message, 'err'); else toast(err.message, 'err'); }
}

/* ============ GIAO DIỆN SÁNG / TỐI ============ */
document.documentElement.dataset.theme = localStorage.getItem('theme') || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
function toggleTheme() { const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = t; localStorage.setItem('theme', t); }

/* ============ KHUNG CRUD DÙNG CHUNG (danh mục, kho, nhà cung cấp...) ============ */
// cfg: { title, base, key, cols:[[tiêu đề, hàm hiển thị]], fields:[{n,l,type,req}], write:[quyền được sửa], extraActions }
function crudPage(cfg) {
  return async () => {
    const canW = cfg.write.includes(user.quyen);
    $('#main').innerHTML = `<div class="bar"><h2>${cfg.title}</h2><div><input id="q" placeholder="Tìm kiếm...">${canW ? '<button class="btn primary" id="add">+ Thêm mới</button>' : ''}</div></div><div id="list"></div>`;
    const load = async () => {
      const ds = await api('GET', `${cfg.base}?q=${encodeURIComponent($('#q').value)}`);
      $('#list').innerHTML = tbl([...cfg.cols.map(c => c[0]), canW ? '' : null].filter(x => x !== null), ds.map(o => `<tr>${cfg.cols.map(c => `<td>${c[1](o)}</td>`).join('')}${canW ? `<td><button class="btn sm" data-e="${o[cfg.key]}">Sửa</button><button class="btn sm danger" data-x="${o[cfg.key]}">Xóa</button></td>` : ''}</tr>`));
      $$('#list [data-e]').forEach(b => b.onclick = () => form(ds.find(o => o[cfg.key] === b.dataset.e)));
      $$('#list [data-x]').forEach(b => b.onclick = async () => { if (!confirm('Xác nhận xóa ' + b.dataset.x + '?')) return; try { await api('DELETE', `${cfg.base}/${b.dataset.x}`); toast('Đã xóa'); } catch (e) { toast(e.message, 'err'); } load(); });
    };
    const form = o => {
      const m = modal((o ? 'Cập nhật ' : 'Thêm mới ') + cfg.title.toLowerCase(), `<form class="grid">${cfg.fields.map(f => fld(f.n, f.l + (f.req ? ' *' : ''), f.type || 'text', o ? o[f.n] : '')).join('')}<div class="full right"><button type="button" class="btn" data-close>Hủy</button> <button class="btn primary">Lưu</button></div></form>`);
      $('form', m).onsubmit = e => { e.preventDefault(); const b = formData(e); submitModal(m, () => o ? api('PUT', `${cfg.base}/${o[cfg.key]}`, b) : api('POST', cfg.base, b), o ? 'Cập nhật thành công' : 'Thêm mới thành công', load); };
    };
    $('#q').oninput = load; if (canW) $('#add').onclick = () => form(null); load();
  };
}

/* ============ ĐĂNG NHẬP / KHUNG ỨNG DỤNG ============ */
function renderLogin() {
  const demo = [['admin', 'admin123', 'Quản trị viên'], ['quanly', '123456', 'Quản lý'], ['banhang', '123456', 'Nhân viên bán hàng'], ['kho', '123456', 'Nhân viên kho'], ['khachhang', '123456', 'Khách hàng']];
  $('#app').innerHTML = `<div class="login card"><h2>🛒 Hệ thống quản lý siêu thị</h2><p class="note">Đăng nhập để tiếp tục</p>
  <form id="lf">${fld('tenDangNhap', 'Tên đăng nhập')}${fld('matKhau', 'Mật khẩu', 'password')}<p class="err" id="le"></p><button class="btn primary" style="width:100%">Đăng nhập</button></form>
  <p class="note" style="margin-top:12px">Tài khoản mẫu (bấm để điền):</p><div class="chips">${demo.map(d => `<button class="btn sm" data-u="${d[0]}" data-p="${d[1]}">${d[2]}</button>`).join('')}</div>
  <p><button class="btn sm" onclick="toggleTheme()">🌓 Sáng/Tối</button></p></div>`;
  $$('.chips button').forEach(b => b.onclick = () => { $('[name=tenDangNhap]').value = b.dataset.u; $('[name=matKhau]').value = b.dataset.p; });
  $('#lf').onsubmit = async e => {
    e.preventDefault();
    try { const r = await api('POST', '/login', formData(e)); token = r.token; user = r.user; localStorage.setItem('token', token); renderApp(); }
    catch (err) { $('#le').textContent = err.message; }
  };
}
function renderApp() {
  const items = MENU.filter(m => m.r.includes(user.quyen));
  $('#app').innerHTML = `<div class="shell"><aside><div class="brand">🛒 Siêu thị</div>${items.map(m => `<a href="#${m.id}" data-id="${m.id}">${m.t}</a>`).join('')}
  <div class="me"><b>${esc(user.hoTen)}</b><br>${esc(user.chucVu)}<br><br><button class="btn sm" onclick="toggleTheme()">🌓</button> <button class="btn sm" id="mk">Đổi mật khẩu</button> <button class="btn sm" id="lo">Đăng xuất</button></div></aside><main id="main"></main></div>`;
  $('#lo').onclick = async () => { try { await api('POST', '/logout'); } catch {} localStorage.removeItem('token'); token = null; renderLogin(); };
  $('#mk').onclick = () => {
    const m = modal('Đổi mật khẩu', `<form class="grid">${fld('matKhauCu', 'Mật khẩu hiện tại', 'password')}${fld('matKhauMoi', 'Mật khẩu mới (tối thiểu 6 ký tự)', 'password')}<div class="full right"><button type="button" class="btn" data-close>Hủy</button> <button class="btn primary">Lưu</button></div></form>`);
    $('form', m).onsubmit = e => { e.preventDefault(); submitModal(m, () => api('POST', '/doimatkhau', formData(e)), 'Đã đổi mật khẩu'); };
  };
  const go = () => {
    const m = items.find(x => '#' + x.id === location.hash) || items[0];
    $$('aside a').forEach(a => a.classList.toggle('on', a.dataset.id === m.id));
    m.f().catch(e => toast(e.message, 'err'));
  };
  window.onhashchange = go; go();
}
