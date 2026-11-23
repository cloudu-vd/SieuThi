// CHỨC NĂNG 3 – LẬP HÓA ĐƠN BÁN HÀNG (Nguyễn Văn Du)
// Bám theo biểu đồ trình tự 4.3 (taoHoaDon, timKhachHang, themSanPham, tinhTongTien, apDungKhuyenMai, xacNhanHoaDon, xuatHoaDon)
// và sơ đồ trạng thái 5.3: Mới tạo -> Đang lập -> Chờ thanh toán -> Đã thanh toán -> Đã xuất ; Đang lập/Chờ thanh toán -> Đã hủy ; Chờ thanh toán -> Đang lập (sửa lại)
// Quy tắc theo thực tế bán lẻ: khuyến mãi tự áp dụng (mỗi sản phẩm chỉ hưởng 1 chương trình có lợi nhất); tồn kho chỉ bị trừ khi THANH TOÁN thành công;
// thanh toán có phương thức, tiền khách đưa, tiền thừa; tích điểm cho khách (1 điểm / 10.000 ₫); hóa đơn đã thanh toán không được hủy.
const { db, transaction, nextCode } = require('./db');
const { bad, notFound, str, now } = require('./util');
const { capNhatTon, tonCua, tenNV, tenKH } = require('./core');
const { KhuyenMaiController } = require('./khuyenmai');
const PHUONG_THUC = ['Tiền mặt', 'Thẻ', 'Chuyển khoản / QR', 'Ví điện tử'], DIEM_MOI = 10000;   // 1 điểm tích lũy cho mỗi 10.000 ₫

const MOI = 'Mới tạo', LAP = 'Đang lập', CHO = 'Chờ thanh toán', DA = 'Đã thanh toán', XUAT = 'Đã xuất', HUY = 'Đã hủy';
const view = (d, h) => ({ ...h, tenNV: tenNV(d, h.maNV), tenKH: h.maKH ? tenKH(d, h.maKH) : '', dsMaKM: dsKM(h), giamTheoKM: h.giamTheoKM || [], tenKM: (h.giamTheoKM || []).map(g => g.tenKM).join(', '),
  tamTinh: h.tongTien + h.tienGiam, kmKhaDung: kmKhaDung(d, h),
  chiTiet: d.chitiethoadon.filter(c => c.maHD === h.maHD).map(c => { const sp = d.sanpham.find(s => s.maSP === c.maSP) || {}; return { ...c, tenSP: sp.tenSP, tonKho: tonCua(d, c.maSP).soLuongTon }; }) });
// Các chương trình đang diễn ra có sản phẩm nằm trong hóa đơn; apDung = nhân viên chưa bỏ chọn
const kmDangChay = (d, ma) => d.khuyenmai.find(k => k.maKM === ma && k.maTrangThai === 'TT3');
const dongKM = (d, ma, c) => d.chitietkhuyenmai.some(x => x.maKM === ma && x.maSP === c.maSP && x.trangThai === 'Đang áp dụng');
function kmKhaDung(d, h) {
  if (!dangLap(h)) return [];
  const dong = d.chitiethoadon.filter(c => c.maHD === h.maHD);
  return d.khuyenmai.filter(k => k.maTrangThai === 'TT3' && dong.some(c => dongKM(d, k.maKM, c))).map(k => ({ maKM: k.maKM, tenKM: k.tenChuongTrinh, hinhThuc: k.maLoai === 'PT' ? k.giaTriGiam + '%' : Number(k.giaTriGiam).toLocaleString('vi-VN') + ' ₫/sp', apDung: !(h.kmBo || []).includes(k.maKM), soTien: ((h.giamTheoKM || []).find(g => g.maKM === k.maKM) || {}).soTien || 0 }));
}
const giamDong = (km, c) => Math.min(c.thanhTien, km.maLoai === 'PT' ? Math.round(c.thanhTien * km.giaTriGiam / 100) : c.soLuong * km.giaTriGiam);   // ST: giảm trên mỗi đơn vị sản phẩm
const dsKM = h => h.dsMaKM || (h.maKM ? [h.maKM] : []);           // danh sách mã khuyến mãi đã áp dụng (nhiều mã)
const dangLap = h => [MOI, LAP].includes(h.trangThai);

const HoaDonController = {
  danhSach(user) { const d = db(); return d.hoadon.filter(h => user.quyen !== 'KHACH_HANG' || h.maKH === user.maKH).map(h => view(d, h)).reverse(); },
  chiTiet(ma, user) {
    const d = db(), h = d.hoadon.find(x => x.maHD === ma); if (!h) throw notFound('Không tìm thấy hóa đơn');
    if (user && user.quyen === 'KHACH_HANG' && h.maKH !== user.maKH) throw notFound('Không tìm thấy hóa đơn');
    return view(d, h);
  },
  find(ma) { const h = db().hoadon.find(x => x.maHD === ma); if (!h) throw notFound('Không tìm thấy hóa đơn'); return h; },
  mustEdit(h) { if (!dangLap(h)) throw bad(`Hóa đơn đang ở trạng thái "${h.trangThai}", không thể chỉnh sửa`); },
  // Tính lại tổng tiền: tạm tính = tổng thành tiền các dòng. Khuyến mãi tự áp dụng theo từng dòng: mỗi sản phẩm chỉ hưởng MỘT chương trình (chương trình giảm nhiều nhất,
  // không tính chương trình nhân viên đã bỏ chọn). Số tiền giảm không bao giờ vượt thành tiền của dòng.
  tinhTongTien(d, h) {
    const dong = d.chitiethoadon.filter(c => c.maHD === h.maHD), tam = dong.reduce((s, c) => s + c.thanhTien, 0), bo = h.kmBo || [], tong = {};
    dong.forEach(c => {
      let best = null, bg = 0;
      d.khuyenmai.forEach(k => { if (k.maTrangThai !== 'TT3' || bo.includes(k.maKM) || !dongKM(d, k.maKM, c)) return; const g = giamDong(k, c); if (g > bg) { bg = g; best = k; } });
      if (best) { tong[best.maKM] = tong[best.maKM] || { maKM: best.maKM, tenKM: best.tenChuongTrinh, soTien: 0 }; tong[best.maKM].soTien += bg; }
    });
    const ct = Object.values(tong);
    h.giamTheoKM = ct; h.dsMaKM = ct.map(g => g.maKM); h.tienGiam = ct.reduce((s, g) => s + g.soTien, 0); h.tongTien = tam - h.tienGiam; delete h.maKM;
  },
  dongThuocKM: dongKM,
  // taoHoaDon(): "Chọn lập hóa đơn" -> hóa đơn mới ở trạng thái Mới tạo
  taoHoaDon(user) {
    return transaction(d => { const h = { maHD: nextCode('HD', 6), ngayLap: now(), tongTien: 0, tienGiam: 0, trangThai: MOI, maNV: user.maNV, maKH: null, dsMaKM: [], kmBo: [], giamTheoKM: [] }; d.hoadon.push(h); return view(d, h); });
  },
  // timKhachHang(maKH): bước 3-4. A3: không tìm thấy -> báo lỗi, nhân viên có thể bán không gắn khách
  timKhachHang(ma, b) {
    const h = this.find(ma); this.mustEdit(h);
    const k = str(b.maKH) ? db().khachhang.find(x => x.maKH === str(b.maKH).toUpperCase() || x.soDienThoai === str(b.maKH)) : null;
    if (str(b.maKH) && !k) throw notFound('Không tìm thấy khách hàng');
    if (k && k.trangThai !== 'Hoạt động') throw bad(`Khách hàng đang ở trạng thái "${k.trangThai}"`);
    return transaction(d => { h.maKH = k ? k.maKH : null; h.trangThai = LAP; return view(d, h); });
  },
  // themSanPham(maSP, soLuong): bước 5-9 (kiểm tra sản phẩm, kiểm tra tồn kho)
  themSanPham(ma, b) {
    KhuyenMaiController.dongBo(); const h = this.find(ma); this.mustEdit(h); const d = db();
    const sp = d.sanpham.find(s => s.maSP === str(b.maSP).toUpperCase());
    if (!sp) throw bad('Sản phẩm không tồn tại, vui lòng nhập lại mã sản phẩm');                          // A1
    if (!sp.dangKinhDoanh) throw bad('Sản phẩm đang ngừng kinh doanh');
    const sl = Number(b.soLuong); if (!Number.isInteger(sl) || sl <= 0) throw bad('Số lượng phải là số nguyên lớn hơn 0');
    const cur = d.chitiethoadon.find(c => c.maHD === ma && c.maSP === sp.maSP), tong = sl + (cur ? cur.soLuong : 0), ton = tonCua(d, sp.maSP).soLuongTon;
    if (tong > ton) throw bad(`Số lượng tồn kho không đủ (còn ${ton})`);                                  // A2
    return transaction(d => {
      if (cur) { cur.soLuong = tong; cur.thanhTien = tong * cur.donGia; }
      else d.chitiethoadon.push({ maCTHD: nextCode('CTHD', 6), maHD: ma, maSP: sp.maSP, soLuong: sl, donGia: sp.donGia, thanhTien: sl * sp.donGia });
      h.trangThai = LAP; this.tinhTongTien(d, h); return view(d, h);
    });
  },
  // Use case mở rộng: Cập nhật số lượng / Xóa sản phẩm
  capNhatSoLuong(ma, maSP, b) {
    const h = this.find(ma); this.mustEdit(h); const d = db(), c = d.chitiethoadon.find(x => x.maHD === ma && x.maSP === maSP); if (!c) throw notFound('Sản phẩm không có trong hóa đơn');
    const sl = Number(b.soLuong); if (!Number.isInteger(sl) || sl <= 0) throw bad('Số lượng phải là số nguyên lớn hơn 0');
    const ton = tonCua(d, maSP).soLuongTon; if (sl > ton) throw bad(`Số lượng tồn kho không đủ (còn ${ton})`);
    KhuyenMaiController.dongBo(); return transaction(d => { c.soLuong = sl; c.thanhTien = sl * c.donGia; this.tinhTongTien(d, h); return view(d, h); });
  },
  xoaSanPham(ma, maSP) {
    const h = this.find(ma); this.mustEdit(h);
    return transaction(d => { d.chitiethoadon = d.chitiethoadon.filter(c => !(c.maHD === ma && c.maSP === maSP)); this.tinhTongTien(d, h); return view(d, h); });
  },
  // apDungKhuyenMai(): bước 12-14. Hệ thống tự áp dụng khuyến mãi đang diễn ra; nhân viên chỉ chọn GIỮ hoặc BỎ từng chương trình (b.dsMaKM = các chương trình giữ lại).
  // A4: chương trình không hợp lệ (không tồn tại / không đang diễn ra / không có sản phẩm trong hóa đơn) -> thông báo rõ lý do
  apDungKhuyenMai(ma, b) {
    KhuyenMaiController.dongBo();
    const h = this.find(ma); this.mustEdit(h); const d = db(), ds = [...new Set(Array.isArray(b.dsMaKM) ? b.dsMaKM : [])];
    ds.forEach(m => {
      const km = d.khuyenmai.find(k => k.maKM === m);
      if (!km) throw bad(`Chương trình khuyến mãi ${m} không tồn tại`);
      if (km.maTrangThai !== 'TT3') throw bad(`Chương trình "${km.tenChuongTrinh}" không áp dụng được vì không ở trạng thái "Đang diễn ra"`);
      if (!d.chitiethoadon.some(c => c.maHD === ma && dongKM(d, m, c))) throw bad(`Hóa đơn chưa có sản phẩm nào thuộc chương trình "${km.tenChuongTrinh}"`);
    });
    return transaction(d => { h.kmBo = kmKhaDung(d, h).map(k => k.maKM).filter(m => !ds.includes(m)); this.tinhTongTien(d, h); return view(d, h); });
  },
  // xacNhanHoaDon(): bước 15-16. Chốt hóa đơn + chi tiết, tính lại tiền theo khuyến mãi đang hiệu lực -> Chờ thanh toán. CHƯA trừ tồn kho (chỉ kiểm tra còn đủ hàng). Lỗi lưu -> hoàn tác, giữ thông tin (A6)
  xacNhanHoaDon(ma) {
    KhuyenMaiController.dongBo();
    const h = this.find(ma); this.mustEdit(h); const d = db(), dong = d.chitiethoadon.filter(c => c.maHD === ma);
    if (!dong.length) throw bad('Hóa đơn chưa có sản phẩm nào');
    dong.forEach(c => { const ton = tonCua(d, c.maSP).soLuongTon; if (c.soLuong > ton) throw bad(`Số lượng tồn kho không đủ cho sản phẩm ${c.maSP} (còn ${ton})`); });
    return transaction(d => { this.tinhTongTien(d, h); h.trangThai = CHO; h.ngayXacNhan = now(); return view(d, h); });
  },
  // Khách đổi ý (thêm/bớt hàng) khi chưa trả tiền: Chờ thanh toán -> Đang lập
  suaLai(ma) {
    const h = this.find(ma); if (h.trangThai !== CHO) throw bad(`Hóa đơn đang ở trạng thái "${h.trangThai}", không thể sửa lại`);
    return transaction(d => { h.trangThai = LAP; return view(d, h); });
  },
  // thanhToan(): Chờ thanh toán -> Đã thanh toán. Chọn phương thức; tiền mặt phải nhập tiền khách đưa (>= tổng) và hệ thống tính tiền thừa; các hình thức khác thu đúng số tiền.
  // Đến lúc này mới kiểm tra lại tồn kho, TRỪ tồn kho và cộng điểm tích lũy cho khách (nếu có).
  thanhToan(ma, b = {}) {
    const h = this.find(ma); if (h.trangThai !== CHO) throw bad(`Hóa đơn đang ở trạng thái "${h.trangThai}", không thể thanh toán`);
    const pt = str(b.phuongThuc) || PHUONG_THUC[0]; if (!PHUONG_THUC.includes(pt)) throw bad('Phương thức thanh toán không hợp lệ');
    let dua = h.tongTien; if (pt === PHUONG_THUC[0]) { dua = Number(b.tienKhachDua); if (!Number.isFinite(dua) || dua < h.tongTien) throw bad(`Tiền khách đưa chưa đủ (cần tối thiểu ${h.tongTien.toLocaleString('vi-VN')} ₫)`); }
    const d = db(), dong = d.chitiethoadon.filter(c => c.maHD === ma);
    dong.forEach(c => { const ton = tonCua(d, c.maSP).soLuongTon; if (c.soLuong > ton) throw bad(`Số lượng tồn kho không đủ cho sản phẩm ${c.maSP} (còn ${ton}), vui lòng sửa lại hóa đơn`); });
    return transaction(d => {
      dong.forEach(c => capNhatTon(d, c.maSP, -c.soLuong));
      const kh = h.maKH && d.khachhang.find(k => k.maKH === h.maKH); h.diemCong = kh ? Math.floor(h.tongTien / DIEM_MOI) : 0; if (kh) kh.diemTichLuy += h.diemCong;
      Object.assign(h, { trangThai: DA, ngayThanhToan: now(), phuongThuc: pt, tienKhachDua: dua, tienThua: dua - h.tongTien });
      return view(d, h);
    });
  },
  // A5: hủy hóa đơn khi chưa thanh toán (tồn kho chưa bị trừ nên không phải hoàn). Hóa đơn đã thanh toán không hủy được (phải xử lý bằng phiếu trả hàng - ngoài phạm vi)
  huy(ma) {
    const h = this.find(ma); if (![MOI, LAP, CHO].includes(h.trangThai)) throw bad(`Hóa đơn đang ở trạng thái "${h.trangThai}", không thể hủy`);
    return transaction(d => { h.trangThai = HUY; return view(d, h); });
  },
  // xuatHoaDon(): Đã thanh toán -> Đã xuất; trả về trang để in / lưu PDF
  xuatHoaDon(ma) {
    const h0 = this.find(ma); if (![DA, XUAT].includes(h0.trangThai)) throw bad('Chỉ xuất được hóa đơn đã thanh toán');
    if (h0.trangThai === DA) transaction(() => { h0.trangThai = XUAT; });
    const h = view(db(), h0), e = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])), v = n => Number(n).toLocaleString('vi-VN') + ' ₫';
    return { __html: `<!doctype html><meta charset="utf-8"><title>${e(h.maHD)}</title><style>body{font-family:Arial,sans-serif;max-width:720px;margin:24px auto}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #ccc;padding:6px;text-align:left}.r{text-align:right}@media print{button{display:none}}</style>
<h2 style="text-align:center">HÓA ĐƠN BÁN HÀNG</h2><p>Mã: <b>${e(h.maHD)}</b> — Ngày: ${new Date(h.ngayThanhToan || h.ngayLap).toLocaleString('vi-VN')}<br>Nhân viên: ${e(h.tenNV)}<br>Khách hàng: ${e(h.tenKH || 'Khách lẻ')}</p>
<table><tr><th>Sản phẩm</th><th class="r">SL</th><th class="r">Đơn giá</th><th class="r">Thành tiền</th></tr>${h.chiTiet.map(c => `<tr><td>${e(c.tenSP)}</td><td class="r">${c.soLuong}</td><td class="r">${v(c.donGia)}</td><td class="r">${v(c.thanhTien)}</td></tr>`).join('')}</table>
<p class="r">Tạm tính: ${v(h.tamTinh)}<br>${h.giamTheoKM.map(g => 'Khuyến mãi ' + e(g.tenKM) + ': -' + v(g.soTien)).join('<br>')}${h.giamTheoKM.length ? '<br>' : ''}Tổng giảm giá: ${v(h.tienGiam)}<br><b>Tổng thanh toán: ${v(h.tongTien)}</b><br>Hình thức: ${e(h.phuongThuc)}${h.phuongThuc === 'Tiền mặt' ? `<br>Tiền khách đưa: ${v(h.tienKhachDua)}<br>Tiền thừa: ${v(h.tienThua)}` : ''}${h.diemCong ? `<br>Điểm tích lũy được cộng: ${h.diemCong}` : ''}<br><i>Giá đã bao gồm thuế GTGT</i></p><button onclick="print()">In / Lưu PDF</button>` };
  },
};
module.exports = { HoaDonController, PHUONG_THUC };
