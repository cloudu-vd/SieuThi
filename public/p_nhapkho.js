/* ============ CHỨC NĂNG 2: THÊM HÀNG VÀO KHO (Thào A Bảy) ============
   Nhập kho -> Thêm hàng vào kho: bắt đầu lập phiếu (Nháp) -> chọn NCC, sản phẩm, số lượng, đơn giá -> Lưu phiếu nhập (Đang kiểm tra -> Đã ghi nhận) -> cộng tồn kho */
async function pageNhapKho() {
  $('#main').innerHTML = `<div class="bar"><h2>Nhập hàng vào kho</h2><div><button class="btn primary" id="bd">+ Thêm hàng vào kho (lập phiếu nhập)</button></div></div><div id="ds"></div>`;
  const load = async () => {
    const ds = await api('GET', '/phieunhap');
    $('#ds').innerHTML = tbl(['Mã phiếu', 'Ngày', 'Nhà cung cấp', 'Người lập', '>Tổng tiền', 'Trạng thái', ''], ds.map(p => `<tr><td>${p.maPN}</td><td>${fmtDT(p.ngayNhap)}</td><td>${esc(p.tenNCC)}</td><td>${esc(p.tenNV)}</td><td class="r">${vnd(p.tongTien)}</td><td>${tag(p.trangThai)}</td>
      <td>${p.trangThai === 'Nháp' ? `<button class="btn sm primary" data-c="${p.maPN}">Tiếp tục lập</button><button class="btn sm danger" data-h="${p.maPN}">Hủy phiếu</button>` : `<button class="btn sm" data-v="${p.maPN}">Xem</button>`}</td></tr>`));
    $$('#ds [data-c]').forEach(b => b.onclick = () => formPhieu(b.dataset.c, load));
    $$('#ds [data-h]').forEach(b => b.onclick = async () => { try { await api('POST', `/phieunhap/${b.dataset.h}/huy`); toast('Đã hủy phiếu nhập'); } catch (e) { toast(e.message, 'err'); } load(); });
    $$('#ds [data-v]').forEach(b => b.onclick = () => { const p = ds.find(x => x.maPN === b.dataset.v); modal('Phiếu nhập ' + p.maPN, `<p>Nhà cung cấp: <b>${esc(p.tenNCC)}</b> · Người lập: ${esc(p.tenNV)} · ${tag(p.trangThai)}<br>Ghi chú: ${esc(p.ghiChu)}</p>${tbl(['Sản phẩm', '>SL', '>Đơn giá', '>Thành tiền'], p.chiTiet.map(c => `<tr><td>${c.maSP} — ${esc(c.tenSP)}</td><td class="r">${c.soLuong}</td><td class="r">${vnd(c.donGia)}</td><td class="r">${vnd(c.thanhTien)}</td></tr>`))}<p class="right"><b>Tổng: ${vnd(p.tongTien)}</b></p>`, true); });
  };
  $('#bd').onclick = async () => { try { const p = await api('POST', '/phieunhap'); formPhieu(p.maPN, load); load(); } catch (e) { toast(e.message, 'err'); } };   // bước 1-2: bắt đầu lập phiếu
  load();
}
// Biểu mẫu lập phiếu nhập (phiếu đang ở trạng thái Nháp)
async function formPhieu(maPN, onDone) {
  let [ncc, sp] = await Promise.all([api('GET', '/nhacungcap'), api('GET', '/sanpham')]);
  const lines = [{ maSP: '', soLuong: 1, donGia: 0 }];
  const m = modal('Phiếu nhập ' + maPN + ' — ' + 'Nháp', `<div class="grid"><label>Nhà cung cấp *<select id="ncc"></select></label><div style="align-self:end"><button class="btn" id="addncc">+ Thêm nhà cung cấp</button></div><label class="full">Ghi chú<input id="gc"></label></div>
    <h4 style="margin-top:12px">Sản phẩm nhập</h4><div id="lines"></div><p><button class="btn" id="addline">+ Thêm sản phẩm khác</button> <button class="btn" id="addsp">+ Thêm sản phẩm mới</button></p>
    <p class="right"><b>Tổng tiền: <span id="tong">0 ₫</span></b></p><p class="err" id="loi"></p><p class="right"><button class="btn danger" id="huy">Hủy phiếu</button> <button class="btn primary" id="luu">Lưu phiếu nhập</button></p>`, true);
  m.onclick = null;                                                        // không đóng nhầm khi bấm nền
  $('.x', m).onclick = () => { m.remove(); onDone && onDone(); };
  const drawNCC = s => { $('#ncc', m).innerHTML = `<option value="">-- Chọn --</option>` + ncc.map(n => `<option value="${n.maNCC}" ${n.maNCC === s ? 'selected' : ''}>${esc(n.tenNCC)}</option>`).join(''); };
  const tong = () => { $('#tong', m).textContent = vnd(lines.reduce((s, l) => s + l.soLuong * l.donGia, 0)); };      // bước 7
  const draw = () => {
    $('#lines', m).innerHTML = tbl(['Sản phẩm', '>Số lượng', '>Đơn giá', '>Thành tiền', ''], lines.map((l, i) => `<tr><td><select data-i="${i}" data-k="maSP"><option value="">-- Chọn --</option>${sp.map(s => `<option value="${s.maSP}" ${s.maSP === l.maSP ? 'selected' : ''}>${s.maSP} — ${esc(s.tenSP)}</option>`).join('')}</select></td>
      <td><input type="number" min="1" value="${l.soLuong}" data-i="${i}" data-k="soLuong"></td><td><input type="number" min="0" value="${l.donGia}" data-i="${i}" data-k="donGia"></td><td class="r" id="tt${i}">${vnd(l.soLuong * l.donGia)}</td><td><button class="btn sm danger" data-del="${i}">✕</button></td></tr>`));
    $$('[data-k]', m).forEach(el => el.oninput = () => { const l = lines[el.dataset.i]; l[el.dataset.k] = el.dataset.k === 'maSP' ? el.value : Number(el.value); $('#tt' + el.dataset.i, m).textContent = vnd(l.soLuong * l.donGia); tong(); });
    $$('[data-del]', m).forEach(b => b.onclick = () => { lines.splice(b.dataset.del, 1); if (!lines.length) lines.push({ maSP: '', soLuong: 1, donGia: 0 }); draw(); });
    tong();
  };
  drawNCC(); draw();
  $('#addline', m).onclick = () => { lines.push({ maSP: '', soLuong: 1, donGia: 0 }); draw(); };
  $('#addncc', m).onclick = () => { const f = modal('Thêm nhà cung cấp', `<form class="grid">${fld('tenNCC', 'Tên nhà cung cấp *')}${fld('soDienThoai', 'Số điện thoại *')}${fld('diaChi', 'Địa chỉ')}${fld('email', 'Email')}<div class="full right"><button type="button" class="btn" data-close>Hủy</button> <button class="btn primary">Lưu</button></div></form>`);   // ngoại lệ 3a
    $('form', f).onsubmit = e => { e.preventDefault(); submitModal(f, () => api('POST', '/nhacungcap', formData(e)), 'Đã thêm nhà cung cấp', n => { ncc.push(n); drawNCC(n.maNCC); }); }; };
  $('#addsp', m).onclick = () => formSanPham(null, async s => { sp = await api('GET', '/sanpham'); const l = lines.find(x => !x.maSP); if (l) l.maSP = s.maSP; else lines.push({ maSP: s.maSP, soLuong: 1, donGia: 0 }); draw(); });   // ngoại lệ 4a
  $('#huy', m).onclick = async () => { try { await api('POST', `/phieunhap/${maPN}/huy`); toast('Đã hủy phiếu, tồn kho không thay đổi'); m.remove(); onDone && onDone(); } catch (e) { toast(e.message, 'err'); } };
  $('#luu', m).onclick = async () => {
    $('#loi', m).textContent = '';
    try { const p = await api('POST', `/phieunhap/${maPN}/luu`, { maNCC: $('#ncc', m).value, ghiChu: $('#gc', m).value, dong: lines }); toast('Nhập hàng thành công, mã phiếu ' + p.maPN); m.remove(); onDone && onDone(); }
    catch (e) { $('#loi', m).textContent = e.message + ' (phiếu quay về trạng thái Nháp, vui lòng sửa và lưu lại)'; }   // 9a, 9b, 9c
  };
}
