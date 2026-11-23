/* ============ CHỨC NĂNG 1: THÊM MỚI KHÁCH HÀNG (Nguyễn Quang Huy) ============
   Nhân viên bán hàng / Quản lý -> Quản lý khách hàng -> Thêm mới khách hàng (form, kiểm tra, trùng SĐT, cấp thẻ thành viên) */
async function pageKhachHang() {
  $('#main').innerHTML = `<div class="bar"><h2>Quản lý khách hàng</h2><div><input id="q" placeholder="Tìm theo tên, SĐT, mã..."><button class="btn primary" id="add">+ Thêm mới khách hàng</button></div></div><div id="list"></div>`;
  const chuyen = await api('GET', '/chuyenthe');
  const load = async () => {
    const ds = await api('GET', '/khachhang?q=' + encodeURIComponent($('#q').value));
    $('#list').innerHTML = tbl(['Mã KH', 'Họ tên', 'SĐT', 'Email', 'Ngày đăng ký', '>Điểm', 'Thẻ thành viên', 'Trạng thái', ''], ds.map(c => {
      const t = c.theThanhVien;
      const the = t ? `${tag(t.trangThai)} <select data-the="${c.maKH}" style="width:auto"><option value="">Đổi trạng thái thẻ…</option>${Object.entries(chuyen[t.trangThai] || {}).map(([tt, ev]) => `<option value="${tt}">→ ${tt} (${ev})</option>`).join('')}</select>` : `<button class="btn sm" data-ct="${c.maKH}">Cấp thẻ</button>`;
      const tt = c.trangThai === 'Ngừng hoạt động' ? tag(c.trangThai) : `<select data-tt="${c.maKH}" style="width:auto"><option>${c.trangThai}</option>${['Hoạt động', 'Tạm khóa', 'Ngừng hoạt động'].filter(s => s !== c.trangThai).map(s => `<option>${s}</option>`).join('')}</select>`;
      return `<tr><td>${c.maKH}</td><td>${esc(c.hoTen)}</td><td>${c.soDienThoai}</td><td>${esc(c.email)}</td><td>${fmtD(c.ngayDangKy)}</td><td class="r">${c.diemTichLuy}</td><td>${the}</td><td>${tt}</td><td><button class="btn sm" data-e="${c.maKH}">Sửa</button></td></tr>`;
    }));
    const run = (el, fn, msg) => el.onchange = el.onclick = async () => { if (el.tagName === 'SELECT' && !el.value) return; try { await fn(el); toast(msg); } catch (e) { toast(e.message, 'err'); } load(); };
    $$('#list [data-tt]').forEach(s => run(s, e => api('PATCH', `/khachhang/${e.dataset.tt}/trangthai`, { trangThai: e.value }), 'Đã cập nhật trạng thái khách hàng'));
    $$('#list [data-the]').forEach(s => run(s, e => api('PATCH', `/khachhang/${e.dataset.the}/the`, { trangThai: e.value }), 'Đã cập nhật trạng thái thẻ'));
    $$('#list [data-ct]').forEach(b => run(b, e => api('POST', `/khachhang/${e.dataset.ct}/the`), 'Đã cấp thẻ thành viên'));
    $$('#list [data-e]').forEach(b => b.onclick = () => formKhachHang(ds.find(c => c.maKH === b.dataset.e), load));
  };
  $('#q').oninput = load; $('#add').onclick = () => formKhachHang(null, load); load();
}
// Form thêm mới (kh = null) hoặc sửa khách hàng. Dùng lại ở trang lập hóa đơn khi không tìm thấy khách (ngoại lệ A3)
function formKhachHang(kh, onDone) {
  kh = kh || {};
  const m = modal(kh.maKH ? 'Cập nhật khách hàng ' + kh.maKH : 'Thêm mới khách hàng', `<form class="grid">
    ${fld('hoTen', 'Họ tên *', 'text', kh.hoTen || '')}${fld('soDienThoai', 'Số điện thoại *', 'text', kh.soDienThoai || '')}
    ${sel('gioiTinh', 'Giới tính', ['Nam', 'Nữ', 'Khác'], kh.gioiTinh)}${fld('ngaySinh', 'Ngày sinh', 'date', kh.ngaySinh || '')}${fld('email', 'Email', 'text', kh.email || '')}${fld('diaChi', 'Địa chỉ', 'text', kh.diaChi || '')}
    ${kh.maKH ? '' : '<label class="chk full"><input type="checkbox" name="capThe"> Khách đồng ý làm thẻ thành viên</label><div class="full note">Mã khách hàng được sinh tự động; ngày đăng ký = hôm nay; điểm tích lũy = 0; trạng thái "Hoạt động".</div>'}
    <div id="dup" class="full"></div><div class="full right"><button type="button" class="btn" data-close>Hủy</button> <button class="btn primary">Lưu</button></div></form>`);
  $('form', m).onsubmit = async e => {
    e.preventDefault(); const fd = new FormData(e.target), b = Object.fromEntries(fd); b.capThe = !!fd.get('capThe'); $('#dup', m).innerHTML = '';
    try { const r = await (kh.maKH ? api('PUT', '/khachhang/' + kh.maKH, b) : api('POST', '/khachhang', b)); toast(kh.maKH ? 'Cập nhật thành công' : 'Thêm khách hàng thành công'); m.remove(); onDone && onDone(r); }
    catch (err) {
      showErr(m, err.data?.errors || {});
      if (err.status === 409) { const k = err.data.khachHangCu; $('#dup', m).innerHTML = `<div class="warn">Khách hàng đã tồn tại: ${k.maKH} — ${esc(k.hoTen)} (${k.soDienThoai}). Hãy sửa số điện thoại hoặc Hủy.</div>`; }   // ngoại lệ 5a
      else toast(err.message, 'err');
    }
  };
}
