/* ============ CHỨC NĂNG 3: LẬP HÓA ĐƠN BÁN HÀNG (Nguyễn Văn Du) ============
   Luồng theo biểu đồ trình tự: taoHoaDon -> timKhachHang -> themSanPham (kiểm tra SP + tồn kho) -> tính tiền -> áp dụng khuyến mãi -> xác nhận -> thanh toán -> xuất hóa đơn.
   Hóa đơn nằm trên máy chủ từ lúc "Mới tạo"; mọi bước gọi API tương ứng, giao diện hiển thị lại hóa đơn do máy chủ trả về. */
async function pageBanHang() {
  const SP = await api('GET', '/sanpham');
  let ma = sessionStorage.getItem('hdDangLap'), hd = null;
  if (ma) { try { hd = await api('GET', '/hoadon/' + ma); if (!['Mới tạo', 'Đang lập'].includes(hd.trangThai)) hd = null; } catch { hd = null; } }   // tiếp tục hóa đơn đang lập dở
  if (!hd) { hd = await api('POST', '/hoadon'); sessionStorage.setItem('hdDangLap', hd.maHD); }
  $('#main').innerHTML = `<div class="bar"><h2>Lập hóa đơn bán hàng <span class="note" id="mahd"></span></h2><div id="tthd"></div></div><div class="split"><div>
    <div class="card"><b>Khách hàng</b> <span class="note">(không bắt buộc – khách lẻ vẫn được bán)</span><div class="bar" style="margin:8px 0 0"><div style="flex:1"><input id="kh" placeholder="Nhập mã KH hoặc số điện thoại"><button class="btn" id="tkh">Tìm</button></div></div><div id="khinfo" class="note"></div></div>
    <div class="card"><b>Sản phẩm</b><div class="bar" style="margin:8px 0 0"><div style="flex:1"><input id="msp" list="dsp" placeholder="Nhập hoặc quét mã sản phẩm"><datalist id="dsp">${SP.map(s => `<option value="${s.maSP} — ${esc(s.tenSP)}">`).join('')}</datalist><input id="sl" type="number" min="1" value="1" style="width:90px"><button class="btn primary" id="them">Thêm vào hóa đơn</button></div></div></div>
    <div id="lines"></div></div>
    <div class="card"><b>Khuyến mãi</b> <span class="note">(hệ thống tự áp dụng; mỗi sản phẩm chỉ hưởng 1 chương trình có lợi nhất; bỏ chọn nếu không áp dụng)</span><div id="km" style="margin:8px 0"></div>
    <div class="sum" id="sum"></div><p><button class="btn primary" style="width:100%" id="xn">Xác nhận hóa đơn</button></p><p><button class="btn danger" style="width:100%" id="huy">Hủy hóa đơn</button></p></div></div>`;
  const loi = e => toast(e.message, 'err');
  const draw = () => {
    $('#mahd').textContent = hd.maHD; $('#tthd').innerHTML = tag(hd.trangThai); $('#km').innerHTML = hd.kmKhaDung.length ? hd.kmKhaDung.map(k => `<label class="chk"><input type="checkbox" value="${k.maKM}" ${k.apDung ? 'checked' : ''}> ${esc(k.tenKM)} <span class="note">(${k.hinhThuc}${k.apDung ? ' · giảm ' + vnd(k.soTien) : ''})</span></label>`).join('') : '<span class="note">Không có chương trình khuyến mãi phù hợp với các sản phẩm trong hóa đơn</span>';
    if (hd.maKH) $('#khinfo').innerHTML = `✔ ${hd.maKH} — <b>${esc(hd.tenKH)}</b>`;
    $('#lines').innerHTML = tbl(['Sản phẩm', '>Đơn giá', '>Số lượng', '>Thành tiền', ''], hd.chiTiet.map(c => `<tr><td>${c.maSP} — ${esc(c.tenSP)}</td><td class="r">${vnd(c.donGia)}</td><td class="r"><input type="number" min="1" value="${c.soLuong}" data-sp="${c.maSP}" style="width:80px"></td><td class="r">${vnd(c.thanhTien)}</td><td><button class="btn sm danger" data-del="${c.maSP}">Xóa</button></td></tr>`), 'Chưa có sản phẩm nào');
    $('#sum').innerHTML = `<div><span>Tạm tính</span><span>${vnd(hd.tamTinh)}</span></div>${hd.giamTheoKM.map(g => `<div><span class="note">• ${esc(g.tenKM)}</span><span>- ${vnd(g.soTien)}</span></div>`).join("")}<div><span>Tổng giảm giá</span><span>- ${vnd(hd.tienGiam)}</span></div><div class="tot"><span>Cần thanh toán</span><span>${vnd(hd.tongTien)}</span></div>`;
    $$('#lines input').forEach(el => el.onchange = async () => { try { hd = await api('PUT', `/hoadon/${hd.maHD}/sanpham/${el.dataset.sp}`, { soLuong: el.value }); } catch (e) { loi(e); } draw(); });   // mở rộng: Cập nhật số lượng
    $$('#lines [data-del]').forEach(b => b.onclick = async () => { try { hd = await api('DELETE', `/hoadon/${hd.maHD}/sanpham/${b.dataset.del}`); } catch (e) { loi(e); } draw(); });          // mở rộng: Xóa sản phẩm
  };
  $('#tkh').onclick = async () => {                                                    // timKhachHang(maKH)
    try { hd = await api('PUT', `/hoadon/${hd.maHD}/khachhang`, { maKH: $('#kh').value.trim() }); $('#khinfo').innerHTML = hd.maKH ? '' : 'Khách lẻ'; draw(); }
    catch (e) { $('#khinfo').innerHTML = `<span class="err">${esc(e.message)}.</span> Có thể bán không gắn khách hàng hoặc <a href="#" id="newkh">tạo khách hàng mới</a>.`; $('#newkh') && ($('#newkh').onclick = ev => { ev.preventDefault(); formKhachHang(null, k => { $('#kh').value = k.maKH; $('#tkh').click(); }); }); }   // A3
  };
  $('#them').onclick = async () => {                                                   // themSanPham(maSP, soLuong)
    try { hd = await api('POST', `/hoadon/${hd.maHD}/sanpham`, { maSP: $('#msp').value.split(' ')[0], soLuong: $('#sl').value }); $('#msp').value = ''; $('#sl').value = 1; draw(); } catch (e) { loi(e); }   // A1, A2
  };
  $('#km').onchange = async () => { try { hd = await api('PUT', `/hoadon/${hd.maHD}/khuyenmai`, { dsMaKM: $$('#km input:checked').map(c => c.value) }); } catch (er) { loi(er); } draw(); };   // apDungKhuyenMai (A4): nhiều chương trình
  $('#huy').onclick = async () => { if (!confirm('Bạn có chắc muốn hủy hóa đơn đang lập? Tồn kho không bị ảnh hưởng.')) return; try { await api('POST', `/hoadon/${hd.maHD}/huy`); sessionStorage.removeItem('hdDangLap'); toast('Đã hủy hóa đơn'); pageBanHang(); } catch (e) { loi(e); } };   // A5
  $('#xn').onclick = async () => {                                                     // xacNhanHoaDon()
    try { const h = await api('POST', `/hoadon/${hd.maHD}/xacnhan`); sessionStorage.removeItem('hdDangLap'); toast('Lập hóa đơn thành công'); hienHoaDon(h, () => pageBanHang()); } catch (e) { loi(e); }   // A2, A6: lỗi thì giữ lại thông tin đang nhập
  };
  draw();
}
// Hộp thoại hóa đơn: thanh toán (phương thức, tiền khách đưa, tiền thừa) / sửa lại / hủy / xuất hóa đơn (PDF qua trình duyệt)
function hienHoaDon(h, after) {
  const cho = h.trangThai === 'Chờ thanh toán', canAct = user.quyen !== 'KHACH_HANG', daTT = ['Đã thanh toán', 'Đã xuất'].includes(h.trangThai);
  const m = modal('Hóa đơn ' + h.maHD, `${tbl(['Sản phẩm', '>SL', '>Đơn giá', '>Thành tiền'], h.chiTiet.map(c => `<tr><td>${esc(c.tenSP)}</td><td class="r">${c.soLuong}</td><td class="r">${vnd(c.donGia)}</td><td class="r">${vnd(c.thanhTien)}</td></tr>`))}
    <div class="sum"><div><span>Khách hàng</span><span>${esc(h.tenKH || 'Khách lẻ')}</span></div><div><span>Tạm tính</span><span>${vnd(h.tamTinh)}</span></div>${h.giamTheoKM.map(g => `<div><span class="note">• ${esc(g.tenKM)}</span><span>- ${vnd(g.soTien)}</span></div>`).join("")}<div><span>Tổng giảm giá</span><span>- ${vnd(h.tienGiam)}</span></div><div class="tot"><span>Cần thanh toán</span><span>${vnd(h.tongTien)}</span></div>
    ${daTT ? `<div><span>Hình thức thanh toán</span><span>${esc(h.phuongThuc || '')}</span></div>${h.phuongThuc === 'Tiền mặt' ? `<div><span>Tiền khách đưa</span><span>${vnd(h.tienKhachDua)}</span></div><div><span>Tiền thừa trả khách</span><span>${vnd(h.tienThua)}</span></div>` : ''}${h.diemCong ? `<div><span>Điểm tích lũy được cộng</span><span>+${h.diemCong}</span></div>` : ''}` : ''}<div><span>Trạng thái</span><span>${tag(h.trangThai)}</span></div></div>
    ${cho && canAct ? `<div class="card"><b>Thanh toán</b><div class="grid"><label>Hình thức<select id="pt"><option>Tiền mặt</option><option>Thẻ</option><option>Chuyển khoản / QR</option><option>Ví điện tử</option></select></label><label id="lbdua">Tiền khách đưa<input id="dua" type="number" min="0" value="${h.tongTien}"></label></div><p id="thua" class="note"></p></div>` : ''}<p class="right" id="acts"></p>`, true);
  $('#acts', m).innerHTML = canAct ? (cho ? '<button class="btn primary" id="pay">Xác nhận đã thanh toán</button> <button class="btn" id="edit">Sửa lại hóa đơn</button> <button class="btn danger" id="cancel">Hủy hóa đơn</button> ' : '') + (daTT ? '<button class="btn primary" id="out">Xuất hóa đơn (In / PDF)</button> ' : '') : '';
  $('#acts', m).innerHTML += '<button class="btn" data-close>Đóng</button>';
  if (cho && canAct) {
    const cap = () => { const tm = $('#pt', m).value === 'Tiền mặt'; $('#lbdua', m).style.display = tm ? '' : 'none'; $('#thua', m).textContent = tm ? (Number($('#dua', m).value) >= h.tongTien ? 'Tiền thừa trả khách: ' + vnd(Number($('#dua', m).value) - h.tongTien) : 'Tiền khách đưa chưa đủ') : 'Thu đúng số tiền ' + vnd(h.tongTien); };
    $('#pt', m).onchange = cap; $('#dua', m).oninput = cap; cap();
  }
  const run = (id, fn) => { const b = $('#' + id, m); if (b) b.onclick = async () => { try { const r = await fn(); m.remove(); hienHoaDon(r, after); } catch (e) { toast(e.message, 'err'); } }; };
  run('pay', () => api('POST', `/hoadon/${h.maHD}/thanhtoan`, { phuongThuc: $('#pt', m).value, tienKhachDua: $('#dua', m).value })); run('cancel', () => api('POST', `/hoadon/${h.maHD}/huy`));
  const e = $('#edit', m); if (e) e.onclick = async () => { try { await api('POST', `/hoadon/${h.maHD}/sualai`); sessionStorage.setItem('hdDangLap', h.maHD); m.remove(); location.hash = '#banhang'; pageBanHang(); } catch (er) { toast(er.message, 'err'); } };
  const o = $('#out', m); if (o) o.onclick = async () => { try { const html = await api('GET', `/hoadon/${h.maHD}/xuat`); const w = window.open('', '_blank'); w.document.write(html); w.document.close(); toast('Đã xuất hóa đơn'); } catch (e) { toast(e.message, 'err'); } };
  m.addEventListener('click', e => { if (e.target === m || e.target.hasAttribute('data-close')) after && after(); });
}
async function pageHoaDon() {
  const ds = await api('GET', '/hoadon'), kh = user.quyen === 'KHACH_HANG';
  $('#main').innerHTML = `<div class="bar"><h2>${kh ? 'Hóa đơn của tôi' : 'Danh sách hóa đơn'}</h2></div>` + tbl(['Mã HĐ', 'Ngày lập', 'Nhân viên', 'Khách hàng', 'Khuyến mãi', '>Tổng tiền', 'Trạng thái', ''], ds.map(h => `<tr><td>${h.maHD}</td><td>${fmtDT(h.ngayLap)}</td><td>${esc(h.tenNV)}</td><td>${esc(h.tenKH || 'Khách lẻ')}</td><td>${esc(h.tenKM)}</td><td class="r">${vnd(h.tongTien)}</td><td>${tag(h.trangThai)}</td><td><button class="btn sm" data-ma="${h.maHD}">Xem${kh ? '' : ' / xử lý'}</button></td></tr>`));
  $$('#main [data-ma]').forEach(b => b.onclick = () => { const h = ds.find(x => x.maHD === b.dataset.ma); if (['Mới tạo', 'Đang lập'].includes(h.trangThai)) { sessionStorage.setItem('hdDangLap', h.maHD); location.hash = '#banhang'; } else hienHoaDon(h, pageHoaDon); });
}
