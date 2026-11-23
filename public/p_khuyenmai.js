/* ============ CHỨC NĂNG 4: QUẢN LÝ KHUYẾN MÃI (Nguyễn Hoàng Sơn) — UC01..UC07 ============
   UC01 Thêm · UC02 Cập nhật · UC03 Xóa · UC04 Tìm kiếm · UC05 Xem chi tiết · UC06 Quản lý sản phẩm áp dụng · UC07 Ngừng áp dụng */
const picker = (sp, sel) => `<input class="pq" placeholder="Tìm sản phẩm..."><div class="pick">${sp.map(s => `<label data-t="${esc((s.maSP + ' ' + s.tenSP).toLowerCase())}"><input type="checkbox" value="${s.maSP}" ${sel.includes(s.maSP) ? 'checked' : ''}> ${s.maSP} — ${esc(s.tenSP)}</label>`).join('')}</div><span class="err" data-err="dsSanPham"></span>`;
const pickerBind = el => { $('.pq', el).oninput = e => { const q = e.target.value.toLowerCase(); $$('.pick label', el).forEach(l => l.style.display = l.dataset.t.includes(q) ? '' : 'none'); }; };
const picked = el => $$('.pick input:checked', el).map(i => i.value);
const giaTri = k => (k.maLoai === 'PT' ? k.giaTriGiam + '%' : vnd(k.giaTriGiam));

async function pageKhuyenMai() {
  const canW = user.quyen === 'QUAN_LY';
  $('#main').innerHTML = `<div class="bar"><h2>Quản lý khuyến mãi</h2><div><input id="q" placeholder="Tìm theo mã, tên, mô tả..."><select id="tt"><option value="">Tất cả trạng thái</option>${['Chưa bắt đầu', 'Đang diễn ra', 'Đã kết thúc', 'Ngừng áp dụng'].map(s => `<option>${s}</option>`).join('')}</select>${canW ? '<button class="btn primary" id="add">+ Thêm chương trình</button>' : ''}</div></div><div id="list"></div>`;
  const load = async () => {                                                            // UC04
    const ds = await api('GET', `/khuyenmai?q=${encodeURIComponent($('#q').value)}&trangThai=${encodeURIComponent($('#tt').value)}`);
    $('#list').innerHTML = tbl(['Mã', 'Tên chương trình', 'Hình thức', 'Giá trị giảm', 'Thời gian áp dụng', '>SP', 'Trạng thái', ''], ds.map(k => `<tr><td>${k.maKM}</td><td>${esc(k.tenChuongTrinh)}</td><td>${esc(k.tenLoai)}</td><td>${giaTri(k)}</td><td>${fmtD(k.ngayBatDau)} – ${fmtD(k.ngayKetThuc)}</td><td class="r">${k.soSP}</td><td>${tag(k.trangThai)}</td>
      <td><button class="btn sm" data-a="xem" data-ma="${k.maKM}">Xem</button>${canW ? `<button class="btn sm" data-a="sua" data-ma="${k.maKM}">Sửa</button><button class="btn sm" data-a="sp" data-ma="${k.maKM}">Sản phẩm</button>${k.trangThai === 'Đang diễn ra' ? `<button class="btn sm" data-a="ngung" data-ma="${k.maKM}">Ngừng áp dụng</button>` : ''}<button class="btn sm danger" data-a="xoa" data-ma="${k.maKM}">Xóa</button>` : ''}</td></tr>`), 'Không có chương trình phù hợp với điều kiện tìm kiếm');
    $$('#list [data-a]').forEach(b => b.onclick = () => hanhDongKM(b.dataset.a, b.dataset.ma, load));
  };
  $('#q').oninput = load; $('#tt').onchange = load; if (canW) $('#add').onclick = () => formKM(null, load); load();
}
async function hanhDongKM(a, ma, load) {
  try {
    if (a === 'xem') return xemKM(await api('GET', '/khuyenmai/' + ma));                                              // UC05
    if (a === 'sua') return formKM(await api('GET', '/khuyenmai/' + ma), load);                                       // UC02
    if (a === 'sp') return formSPKM(await api('GET', '/khuyenmai/' + ma), load);                                      // UC06
    if (a === 'ngung' && confirm('Xác nhận ngừng áp dụng chương trình ' + ma + '?')) { await api('POST', `/khuyenmai/${ma}/ngung`); toast('Ngừng áp dụng thành công'); }   // UC07
    if (a === 'xoa' && confirm('Xác nhận xóa chương trình ' + ma + '?')) { await api('DELETE', '/khuyenmai/' + ma); toast('Xóa chương trình thành công'); }               // UC03
    load();
  } catch (e) { toast(e.message, 'err'); load(); }
}
function xemKM(k) {
  modal('Chi tiết ' + k.maKM, `<div class="grid"><div><b>Tên:</b> ${esc(k.tenChuongTrinh)}</div><div><b>Trạng thái:</b> ${tag(k.trangThai)}</div><div><b>Hình thức:</b> ${esc(k.tenLoai)}</div><div><b>Giá trị giảm:</b> ${giaTri(k)}</div><div><b>Thời gian:</b> ${fmtD(k.ngayBatDau)} – ${fmtD(k.ngayKetThuc)}</div><div><b>Người tạo:</b> ${k.nguoiTao} (${fmtDT(k.ngayTao)})</div><div class="full"><b>Mô tả:</b> ${esc(k.moTa)}</div></div><h4 style="margin-top:12px">Sản phẩm áp dụng</h4>` +
    tbl(['Mã SP', 'Tên', '>Giá', 'Trạng thái áp dụng', 'Trạng thái sản phẩm'], k.chiTiet.map(c => `<tr><td>${c.maSP}</td><td>${esc(c.tenSP)}</td><td class="r">${vnd(c.donGia)}</td><td>${tag(c.trangThai)}</td><td>${tag(c.trangThaiSP || '')}</td></tr>`), 'Chương trình chưa có sản phẩm áp dụng'), true);
}
// UC01 (k = null) và UC02 (k = chương trình cần sửa)
async function formKM(k, load) {
  const loai = await api('GET', '/loaigiamgia'), moi = !k, sp = moi ? await api('GET', '/sanpham') : []; k = k || { maLoai: 'PT' };
  const m = modal(moi ? 'Thêm chương trình khuyến mãi' : 'Cập nhật ' + k.maKM, `<form class="grid">${fld('maKM', 'Mã chương trình *', 'text', k.maKM || '', moi ? '' : 'disabled')}${fld('tenChuongTrinh', 'Tên chương trình *', 'text', k.tenChuongTrinh || '')}
    <label class="full">Mô tả<textarea name="moTa">${esc(k.moTa || '')}</textarea></label>${sel('maLoai', 'Hình thức giảm giá *', loai.map(l => [l.maLoai, l.tenLoai]), k.maLoai)}${fld('giaTriGiam', 'Giá trị giảm *', 'number', k.giaTriGiam ?? '', 'min="0" step="any"')}
    ${fld('ngayBatDau', 'Ngày bắt đầu *', 'date', k.ngayBatDau || '')}${fld('ngayKetThuc', 'Ngày kết thúc *', 'date', k.ngayKetThuc || '')}
    ${moi ? `<div class="full"><b>Sản phẩm áp dụng *</b>${picker(sp, [])}<div class="note" id="chon"></div></div>` : '<div class="full note">Thêm/bớt sản phẩm áp dụng bằng nút "Sản phẩm" ở danh sách.</div>'}
    <div class="full right"><button type="button" class="btn" id="huy">Hủy</button> <button class="btn primary">Lưu</button></div></form>`, true);
  if (moi) { pickerBind(m); $('.pick', m).onchange = () => { $('#chon', m).textContent = 'Đã chọn ' + picked(m).length + ' sản phẩm'; }; }
  $('#huy', m).onclick = () => { if (confirm('Bạn có chắc muốn hủy thao tác? Dữ liệu chưa lưu sẽ không được ghi nhận.')) m.remove(); };
  $('form', m).onsubmit = async e => {
    e.preventDefault(); const b = formData(e); if (moi) b.dsSanPham = picked(m);
    try { await (moi ? api('POST', '/khuyenmai', b) : api('PUT', '/khuyenmai/' + k.maKM, b)); toast(moi ? 'Thêm chương trình khuyến mãi thành công' : 'Cập nhật thành công'); m.remove(); load(); }
    catch (err) { showErr(m, err.data?.errors || {}); toast(err.message, 'err'); }
  };
}
// UC06
async function formSPKM(k, load) {
  const sp = await api('GET', '/sanpham'), cur = k.chiTiet.filter(c => c.trangThai !== 'Đã hủy').map(c => c.maSP);
  const m = modal('Sản phẩm áp dụng — ' + k.maKM, `${picker(sp, cur)}<p class="right"><button class="btn" data-close>Hủy</button> <button class="btn primary" id="ok">Xác nhận thay đổi</button></p>`); pickerBind(m);
  $('#ok', m).onclick = async () => { const now = picked(m); try { await api('PUT', `/khuyenmai/${k.maKM}/sanpham`, { them: now.filter(x => !cur.includes(x)), bo: cur.filter(x => !now.includes(x)) }); toast('Cập nhật danh sách sản phẩm thành công'); m.remove(); load(); } catch (e) { toast(e.message, 'err'); } };
}
