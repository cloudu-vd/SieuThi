// CHỨC NĂNG 4 – QUẢN LÝ KHUYẾN MÃI (Nguyễn Hoàng Sơn) – UC01..UC07
// Lớp: ChuongTrinhKhuyenMai, ChiTietKhuyenMai, LoaiGiamGia, TrangThai, SanPham (trạng thái khuyến mãi)
const { db, save, transaction } = require('./db');
const { bad, notFound, str, num, now, today } = require('./util');
const { DATE, hasErr } = require('./core');

const TT = { LUU: 'TT1', CHUA: 'TT2', DANG: 'TT3', KET: 'TT4', NGUNG: 'TT5', HUY: 'TT6' };
const tenTT = (d, ma) => (d.trangthai.find(t => t.maTrangThai === ma) || {}).tenTrangThai;
const ctState = ma => (ma === TT.CHUA ? 'Chưa áp dụng' : ma === TT.DANG ? 'Đang áp dụng' : 'Đã kết thúc');

// Sơ đồ trạng thái: tự chuyển trạng thái theo thời gian ("Ngày bắt đầu chưa đến", "Đến ngày bắt đầu", "Đến ngày kết thúc")
// và đồng bộ trạng thái của ChiTietKhuyenMai, SanPham. Gọi trước mỗi lần đọc/ghi.
function dongBo() {
  const d = db(), t = today(); let doi = false;
  d.khuyenmai.forEach(km => {
    if ([TT.NGUNG, TT.HUY].includes(km.maTrangThai)) return;
    const moi = t < km.ngayBatDau ? TT.CHUA : t > km.ngayKetThuc ? TT.KET : TT.DANG;
    if (km.maTrangThai !== moi) { km.maTrangThai = moi; doi = true; }
  });
  d.chitietkhuyenmai.forEach(c => {
    if (c.trangThai === 'Đã hủy') return;
    const km = d.khuyenmai.find(k => k.maKM === c.maKM), moi = km ? ctState(km.maTrangThai) : 'Đã hủy';
    if (c.trangThai !== moi) { c.trangThai = moi; doi = true; }
  });
  d.sanpham.forEach(sp => {
    const dangAp = d.chitietkhuyenmai.some(c => c.maSP === sp.maSP && c.trangThai === 'Đang áp dụng');
    const moi = dangAp ? 'Đang áp dụng khuyến mãi' : sp.trangThaiKM === 'Đang áp dụng khuyến mãi' ? 'Ngừng áp dụng khuyến mãi' : sp.trangThaiKM;
    if (sp.trangThaiKM !== moi) { sp.trangThaiKM = moi; doi = true; }
  });
  if (doi) save();
}
const view = (d, km) => {
  const ds = d.chitietkhuyenmai.filter(c => c.maKM === km.maKM && c.trangThai !== 'Đã hủy').map(c => c.maSP);
  return { ...km, tenLoai: (d.loaigiamgia.find(l => l.maLoai === km.maLoai) || {}).tenLoai, trangThai: tenTT(d, km.maTrangThai), dsMaSP: ds, soSP: ds.length };
};

const KhuyenMaiController = {
  dongBo, TT,
  find(ma) { const km = db().khuyenmai.find(k => k.maKM === ma); if (!km) throw notFound('Chương trình khuyến mãi không tồn tại'); return km; },
  loaiGiamGia: () => db().loaigiamgia,
  // include: "Kiểm tra thông tin chương trình" (UC01, UC02)
  kiemTraHopLe(b, moi) {
    const e = {};
    if (moi && !str(b.maKM)) e.maKM = 'Vui lòng nhập mã chương trình';
    if (!str(b.tenChuongTrinh)) e.tenChuongTrinh = 'Vui lòng nhập tên chương trình';
    if (!db().loaigiamgia.some(l => l.maLoai === b.maLoai)) e.maLoai = 'Vui lòng chọn hình thức giảm giá';
    const gt = num(b.giaTriGiam);
    if (isNaN(gt)) e.giaTriGiam = 'Vui lòng nhập giá trị giảm';
    else if (b.maLoai === 'PT' && (gt <= 0 || gt > 100)) e.giaTriGiam = 'Giá trị giảm không hợp lệ: phần trăm phải lớn hơn 0 và không quá 100';
    else if (b.maLoai === 'ST' && gt <= 0) e.giaTriGiam = 'Giá trị giảm không hợp lệ: số tiền phải lớn hơn 0';
    if (!DATE.test(b.ngayBatDau || '')) e.ngayBatDau = 'Vui lòng chọn ngày bắt đầu';
    if (!DATE.test(b.ngayKetThuc || '')) e.ngayKetThuc = 'Vui lòng chọn ngày kết thúc';
    else if (!e.ngayBatDau && b.ngayKetThuc <= b.ngayBatDau) e.ngayKetThuc = 'Thời gian áp dụng không hợp lệ: ngày kết thúc phải lớn hơn ngày bắt đầu';
    return e;
  },
  kiemTraSanPham(ds) {
    const d = db(), er = [];
    ds.forEach(ma => { const sp = d.sanpham.find(s => s.maSP === ma); if (!sp) er.push(`Sản phẩm ${ma} không tồn tại`); else if (!sp.dangKinhDoanh) er.push(`Sản phẩm ${ma} đang ngừng kinh doanh nên không đủ điều kiện áp dụng`); });
    return er;
  },
  // UC04: tìm kiếm theo từ khóa/trạng thái; không nhập điều kiện thì hiển thị toàn bộ
  danhSach(q) {
    dongBo(); const d = db(), k = str(q.q).toLowerCase(), tt = str(q.trangThai);
    return d.khuyenmai.map(m => view(d, m)).filter(m => (!k || [m.maKM, m.tenChuongTrinh, m.moTa].join(' ').toLowerCase().includes(k)) && (!tt || m.trangThai === tt)).reverse();
  },
  // UC05: xem chi tiết + danh sách sản phẩm áp dụng
  chiTiet(ma) {
    dongBo(); const d = db(), km = this.find(ma), v = view(d, km);
    v.chiTiet = d.chitietkhuyenmai.filter(c => c.maKM === ma).map(c => { const sp = d.sanpham.find(s => s.maSP === c.maSP) || {}; return { ...c, tenSP: sp.tenSP, donGia: sp.donGia, trangThaiSP: sp.trangThaiKM }; });
    return v;
  },
  // UC01
  them(b, user) {
    dongBo(); const d = db(), e = this.kiemTraHopLe(b, true), ma = str(b.maKM).toUpperCase();
    if (!e.maKM && d.khuyenmai.some(k => k.maKM === ma)) e.maKM = 'Mã chương trình đã tồn tại (bị trùng)';
    const ds = [...new Set(Array.isArray(b.dsSanPham) ? b.dsSanPham : [])];
    if (!ds.length) e.dsSanPham = 'Chương trình phải có ít nhất một sản phẩm';
    else { const er = this.kiemTraSanPham(ds); if (er.length) e.dsSanPham = er.join('; '); }
    if (hasErr(e)) throw bad('Thông tin chương trình không hợp lệ', { errors: e });
    transaction(d => {                                                      // Đang tạo -> Đã lưu; hệ thống ghi nhận người tạo và thời điểm tạo
      d.khuyenmai.push({ maKM: ma, tenChuongTrinh: str(b.tenChuongTrinh), moTa: str(b.moTa), maLoai: b.maLoai, giaTriGiam: num(b.giaTriGiam), ngayBatDau: b.ngayBatDau, ngayKetThuc: b.ngayKetThuc, maTrangThai: TT.LUU, nguoiTao: user.maNV, ngayTao: now() });
      ds.forEach(maSP => d.chitietkhuyenmai.push({ maKM: ma, maSP, ghiChu: '', trangThai: 'Chưa áp dụng' }));
    });
    dongBo(); return this.chiTiet(ma);                                      // xác định trạng thái theo thời gian áp dụng
  },
  // UC02: không cho sửa khi chương trình đã kết thúc / không được phép chỉnh sửa
  capNhat(ma, b) {
    dongBo(); const km = this.find(ma), tt = tenTT(db(), km.maTrangThai);
    if ([TT.KET, TT.NGUNG, TT.HUY].includes(km.maTrangThai)) throw bad(`Chương trình đang ở trạng thái "${tt}", không được phép chỉnh sửa`);
    const e = this.kiemTraHopLe({ ...b }, false); if (hasErr(e)) throw bad('Thông tin nhập vào không hợp lệ, vui lòng chỉnh sửa', { errors: e });
    transaction(() => Object.assign(km, { tenChuongTrinh: str(b.tenChuongTrinh), moTa: str(b.moTa), maLoai: b.maLoai, giaTriGiam: num(b.giaTriGiam), ngayBatDau: b.ngayBatDau, ngayKetThuc: b.ngayKetThuc }));
    dongBo(); return this.chiTiet(ma);
  },
  // UC03: đã phát sinh giao dịch -> từ chối, đề xuất ngừng áp dụng
  xoa(ma) {
    dongBo(); const d = db(), km = this.find(ma);
    if (d.hoadon.some(h => (h.dsMaKM || (h.maKM ? [h.maKM] : [])).includes(ma))) throw bad('Chương trình đã phát sinh giao dịch liên quan, không thể xóa. Đề xuất: chọn "Ngừng áp dụng".');
    transaction(d => { d.khuyenmai.splice(d.khuyenmai.indexOf(km), 1); d.chitietkhuyenmai = d.chitietkhuyenmai.filter(c => c.maKM !== ma); });
    dongBo(); return { ok: true };
  },
  // UC06: thêm / loại bỏ sản phẩm. Loại bỏ -> ChiTietKhuyenMai chuyển "Đã hủy"
  capNhatSanPham(ma, b) {
    dongBo(); const km = this.find(ma);
    if ([TT.KET, TT.NGUNG, TT.HUY].includes(km.maTrangThai)) throw bad('Chương trình đã kết thúc hoặc không cho phép chỉnh sửa');
    const them = [...new Set(b.them || [])], bo = [...new Set(b.bo || [])], er = this.kiemTraSanPham(them);
    if (er.length) throw bad(er.join('; '));
    transaction(d => {
      them.forEach(maSP => { const c = d.chitietkhuyenmai.find(x => x.maKM === ma && x.maSP === maSP); if (c) c.trangThai = 'Chưa áp dụng'; else d.chitietkhuyenmai.push({ maKM: ma, maSP, ghiChu: '', trangThai: 'Chưa áp dụng' }); });
      bo.forEach(maSP => { const c = d.chitietkhuyenmai.find(x => x.maKM === ma && x.maSP === maSP); if (c) c.trangThai = 'Đã hủy'; });
    });
    dongBo(); return this.chiTiet(ma);
  },
  // UC07: chỉ ngừng được chương trình "Đang diễn ra"
  ngungApDung(ma) {
    dongBo(); const km = this.find(ma);
    if (km.maTrangThai !== TT.DANG) throw bad(`Chương trình đang ở trạng thái "${tenTT(db(), km.maTrangThai)}", không thể thực hiện ngừng áp dụng`);
    transaction(d => { km.maTrangThai = TT.NGUNG; d.chitietkhuyenmai.forEach(c => { if (c.maKM === ma && c.trangThai !== 'Đã hủy') c.trangThai = 'Đã kết thúc'; }); });
    dongBo(); return this.chiTiet(ma);
  },
};
module.exports = { KhuyenMaiController };
