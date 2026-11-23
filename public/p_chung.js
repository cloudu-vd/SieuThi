/* ============ CÁC CHỨC NĂNG CHUNG: danh mục, kho, nhà cung cấp, sản phẩm, nhân viên & tài khoản, thống kê, thông tin khách hàng ============ */

// Quản lý danh mục sản phẩm (Quản trị viên)
const pageDanhMuc = crudPage({ title: 'Danh mục sản phẩm', base: '/danhmuc', key: 'maDM', write: ['QUAN_TRI'], cols: [['Mã', o => o.maDM], ['Tên danh mục', o => esc(o.tenDM)]], fields: [{ n: 'tenDM', l: 'Tên danh mục', req: 1 }] });
// Quản lý kho (Quản lý, Nhân viên kho)
const pageKho = crudPage({ title: 'Kho', base: '/kho', key: 'maKho', write: ['QUAN_LY', 'KHO'], cols: [['Mã kho', o => o.maKho], ['Tên kho', o => esc(o.tenKho)], ['Địa chỉ', o => esc(o.diaChi)]], fields: [{ n: 'tenKho', l: 'Tên kho', req: 1 }, { n: 'diaChi', l: 'Địa chỉ' }] });
// Quản lý nhà cung cấp (Quản trị viên, Nhân viên kho)
const pageNCC = crudPage({ title: 'Nhà cung cấp', base: '/nhacungcap', key: 'maNCC', write: ['QUAN_TRI', 'KHO'], cols: [['Mã NCC', o => o.maNCC], ['Tên NCC', o => esc(o.tenNCC)], ['SĐT', o => o.soDienThoai], ['Địa chỉ', o => esc(o.diaChi)], ['Email', o => esc(o.email)]],
  fields: [{ n: 'tenNCC', l: 'Tên nhà cung cấp', req: 1 }, { n: 'soDienThoai', l: 'Số điện thoại', req: 1 }, { n: 'diaChi', l: 'Địa chỉ' }, { n: 'email', l: 'Email' }] });

// Quản lý sản phẩm + xem tồn kho (Quản trị viên, Quản lý, Nhân viên kho được sửa)
async function pageSanPham() {
  const canW = ['QUAN_TRI', 'QUAN_LY', 'KHO'].includes(user.quyen);
  $('#main').innerHTML = `<div class="bar"><h2>Sản phẩm & tồn kho</h2><div><input id="q" placeholder="Tìm sản phẩm...">${canW ? '<button class="btn primary" id="add">+ Thêm sản phẩm</button>' : ''}</div></div><div id="list"></div>`;
  const load = async () => {
    const ds = await api('GET', '/sanpham?q=' + encodeURIComponent($('#q').value));
    $('#list').innerHTML = tbl(['Mã SP', 'Tên sản phẩm', 'Danh mục', 'Kho', 'ĐVT', '>Giá bán', '>Tồn', 'Tình trạng tồn', 'Kinh doanh', 'Khuyến mãi', canW ? '' : null].filter(x => x !== null), ds.map(s => `<tr><td>${s.maSP}</td><td>${esc(s.tenSP)}</td><td>${esc(s.tenDM)}</td><td>${esc(s.tenKho)}</td><td>${esc(s.donViTinh)}</td><td class="r">${vnd(s.donGia)}</td><td class="r">${s.soLuongTon}</td><td>${tag(s.trangThaiTon)}</td><td>${tag(s.dangKinhDoanh ? 'Đang kinh doanh' : 'Ngừng kinh doanh')}</td><td>${tag(s.trangThaiKM)}${s.khuyenMai ? '<br><span class="note">' + esc(s.khuyenMai) + '</span>' : ''}</td>
      ${canW ? `<td><button class="btn sm" data-e="${s.maSP}">Sửa</button><button class="btn sm" data-k="${s.maSP}">${s.dangKinhDoanh ? 'Ngừng KD' : 'Kinh doanh lại'}</button><button class="btn sm danger" data-x="${s.maSP}">Xóa</button></td>` : ''}</tr>`));
    $$('#list [data-e]').forEach(b => b.onclick = () => formSanPham(ds.find(s => s.maSP === b.dataset.e), load));
    $$('#list [data-k]').forEach(b => b.onclick = async () => { const s = ds.find(x => x.maSP === b.dataset.k); try { await api('PATCH', `/sanpham/${s.maSP}/kinhdoanh`, { dangKinhDoanh: !s.dangKinhDoanh }); toast('Đã cập nhật'); } catch (e) { toast(e.message, 'err'); } load(); });
    $$('#list [data-x]').forEach(b => b.onclick = async () => { if (!confirm('Xác nhận xóa sản phẩm ' + b.dataset.x + '?')) return; try { await api('DELETE', '/sanpham/' + b.dataset.x); toast('Đã xóa'); } catch (e) { toast(e.message, 'err'); } load(); });
  };
  $('#q').oninput = load; if (canW) $('#add').onclick = () => formSanPham(null, load); load();
}
// Form thêm/sửa sản phẩm (dùng lại ở chức năng Thêm hàng vào kho: ngoại lệ 4a "Thêm sản phẩm mới")
async function formSanPham(sp, onDone) {
  const [dm, kho] = await Promise.all([api('GET', '/danhmuc'), api('GET', '/kho')]); sp = sp || {};
  const m = modal(sp.maSP ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới', `<form class="grid">${fld('maSP', 'Mã sản phẩm *', 'text', sp.maSP || '', sp.maSP ? 'disabled' : '')}${fld('tenSP', 'Tên sản phẩm *', 'text', sp.tenSP || '')}
    ${sel('maDM', 'Danh mục *', [['', '-- Chọn --'], ...dm.map(d => [d.maDM, d.tenDM])], sp.maDM)}${sel('maKho', 'Kho *', [['', '-- Chọn --'], ...kho.map(k => [k.maKho, k.tenKho])], sp.maKho)}
    ${fld('donViTinh', 'Đơn vị tính *', 'text', sp.donViTinh || '')}${fld('donGia', 'Giá bán *', 'number', sp.donGia ?? '', 'min="0"')}${fld('moTa', 'Mô tả', 'text', sp.moTa || '')}
    <div class="full right"><button type="button" class="btn" data-close>Hủy</button> <button class="btn primary">Lưu</button></div></form>`);
  $('form', m).onsubmit = e => { e.preventDefault(); const b = formData(e); if (sp.maSP) b.maSP = sp.maSP; submitModal(m, () => sp.maSP ? api('PUT', '/sanpham/' + sp.maSP, b) : api('POST', '/sanpham', b), sp.maSP ? 'Cập nhật thành công' : 'Đã thêm sản phẩm', onDone); };
}

// Quản lý nhân viên và tài khoản (Quản trị viên, Quản lý)
const CHUCVU = ['Quản trị viên', 'Quản lý', 'Nhân viên bán hàng', 'Nhân viên kho'];
async function pageNhanVien() {
  $('#main').innerHTML = `<div class="bar"><h2>Nhân viên & tài khoản</h2><div><input id="q" placeholder="Tìm nhân viên..."><button class="btn primary" id="add">+ Thêm nhân viên</button></div></div><div id="list"></div>`;
  const load = async () => {
    const ds = await api('GET', '/nhanvien?q=' + encodeURIComponent($('#q').value));
    $('#list').innerHTML = tbl(['Mã NV', 'Họ tên', 'SĐT', 'Chức vụ', 'Tên đăng nhập', 'Trạng thái', ''], ds.map(n => `<tr><td>${n.maNV}</td><td>${esc(n.hoTen)}</td><td>${n.soDienThoai}</td><td>${n.chucVu}</td><td>${esc(n.tenDangNhap)}</td><td>${tag(n.trangThai ? 'Hoạt động' : 'Khóa')}</td>
      <td><button class="btn sm" data-e="${n.maNV}">Sửa</button><button class="btn sm" data-t="${n.maNV}">${n.trangThai ? 'Khóa' : 'Mở khóa'}</button><button class="btn sm" data-m="${n.maNV}">Đặt lại mật khẩu</button></td></tr>`));
    $$('#list [data-e]').forEach(b => b.onclick = () => form(ds.find(n => n.maNV === b.dataset.e)));
    $$('#list [data-t]').forEach(b => b.onclick = async () => { const n = ds.find(x => x.maNV === b.dataset.t); try { await api('PATCH', `/nhanvien/${n.maNV}/trangthai`, { trangThai: !n.trangThai }); toast('Đã cập nhật trạng thái'); } catch (e) { toast(e.message, 'err'); } load(); });
    $$('#list [data-m]').forEach(b => b.onclick = () => {
      const m = modal('Đặt lại mật khẩu ' + b.dataset.m, `<form>${fld('matKhau', 'Mật khẩu mới (tối thiểu 6 ký tự)', 'text')}<p class="right"><button type="button" class="btn" data-close>Hủy</button> <button class="btn primary">Lưu</button></p></form>`);
      $('form', m).onsubmit = e => { e.preventDefault(); submitModal(m, () => api('POST', `/nhanvien/${b.dataset.m}/matkhau`, formData(e)), 'Đã đặt lại mật khẩu'); };
    });
  };
  const form = n => {
    const m = modal(n ? 'Cập nhật nhân viên' : 'Thêm nhân viên', `<form class="grid">${fld('hoTen', 'Họ tên *', 'text', n ? n.hoTen : '')}${fld('soDienThoai', 'Số điện thoại *', 'text', n ? n.soDienThoai : '')}${sel('chucVu', 'Chức vụ *', CHUCVU, n ? n.chucVu : '')}
      ${n ? '' : fld('tenDangNhap', 'Tên đăng nhập *') + fld('matKhau', 'Mật khẩu *', 'password')}<div class="full right"><button type="button" class="btn" data-close>Hủy</button> <button class="btn primary">Lưu</button></div></form>`);
    $('form', m).onsubmit = e => { e.preventDefault(); const b = formData(e); submitModal(m, () => n ? api('PUT', '/nhanvien/' + n.maNV, b) : api('POST', '/nhanvien', b), 'Lưu thành công', load); };
  };
  $('#q').oninput = load; $('#add').onclick = () => form(null); load();
}

// Thống kê và báo cáo (Quản trị viên, Quản lý)
async function pageThongKe() {
  const t = new Date(), iso = x => new Date(x - t.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  $('#main').innerHTML = `<div class="bar"><h2>Thống kê & báo cáo</h2><div><label>Từ ngày <input id="tu" type="date" value="${iso(t - 29 * 864e5)}"></label><label>Đến ngày <input id="den" type="date" value="${iso(t)}"></label><button class="btn primary" id="xem">Xem báo cáo</button></div></div><div id="kq"></div>`;
  const load = async () => {
    const r = await api('GET', `/thongke?tu=${$('#tu').value}&den=${$('#den').value}`), max = Math.max(1, ...r.theoNgay.map(x => x.doanhThu));
    $('#kq').innerHTML = `<div class="kpis"><div class="kpi">Doanh thu<b>${vnd(r.doanhThu)}</b></div><div class="kpi">Số hóa đơn<b>${r.soHoaDon}</b></div><div class="kpi">Tổng giảm giá<b>${vnd(r.tongGiamGia)}</b></div><div class="kpi">Chi phí nhập hàng<b>${vnd(r.chiPhiNhap)}</b></div><div class="kpi">Số phiếu nhập<b>${r.soPhieuNhap}</b></div><div class="kpi">Sản phẩm / Khách hàng<b>${r.tongSanPham} / ${r.tongKhachHang}</b></div></div>
    <h3>Doanh thu theo ngày</h3>${tbl(['Ngày', '>Số HĐ', '>Doanh thu', ''], r.theoNgay.map(x => `<tr><td>${fmtD(x.ngay)}</td><td class="r">${x.soHoaDon}</td><td class="r">${vnd(x.doanhThu)}</td><td style="width:40%"><div class="barx" style="width:${Math.round(x.doanhThu / max * 100)}%"></div></td></tr>`))}
    <div class="grid"><div><h3>Sản phẩm bán chạy</h3>${tbl(['Sản phẩm', '>SL bán', '>Doanh thu'], r.banChay.map(x => `<tr><td>${x.maSP} — ${esc(x.tenSP)}</td><td class="r">${x.soLuong}</td><td class="r">${vnd(x.doanhThu)}</td></tr>`))}</div>
    <div><h3>Khách hàng mua nhiều</h3>${tbl(['Khách hàng', '>Số HĐ', '>Tổng chi'], r.khachHang.map(x => `<tr><td>${x.maKH} — ${esc(x.hoTen)}</td><td class="r">${x.soHoaDon}</td><td class="r">${vnd(x.tongChi)}</td></tr>`))}</div></div>
    <h3>Cảnh báo tồn kho (≤ 10)</h3>${tbl(['Sản phẩm', '>Tồn', 'Tình trạng'], r.tonKhoCanhBao.map(x => `<tr><td>${x.maSP} — ${esc(x.tenSP)}</td><td class="r">${x.soLuongTon}</td><td>${tag(x.trangThai)}</td></tr>`), 'Không có sản phẩm sắp hết')}`;
  };
  $('#xem').onclick = () => load().catch(e => toast(e.message, 'err')); load();
}

// Khách hàng: xem thông tin cá nhân + thẻ thành viên
async function pageToi() {
  const k = await api('GET', '/toi');
  $('#main').innerHTML = `<div class="bar"><h2>Thông tin của tôi</h2></div><div class="card"><div class="grid"><div><b>Mã KH:</b> ${k.maKH}</div><div><b>Họ tên:</b> ${esc(k.hoTen)}</div><div><b>SĐT:</b> ${k.soDienThoai}</div><div><b>Email:</b> ${esc(k.email)}</div><div><b>Địa chỉ:</b> ${esc(k.diaChi)}</div><div><b>Ngày đăng ký:</b> ${fmtD(k.ngayDangKy)}</div><div><b>Điểm tích lũy:</b> ${k.diemTichLuy}</div><div><b>Trạng thái:</b> ${tag(k.trangThai)}</div>
    <div class="full"><b>Thẻ thành viên:</b> ${k.theThanhVien ? `${k.theThanhVien.maThe} · hạng ${k.theThanhVien.hangThe} · cấp ${fmtD(k.theThanhVien.ngayCap)} ${tag(k.theThanhVien.trangThai)}` : 'Chưa có thẻ'}</div></div></div>`;
}
