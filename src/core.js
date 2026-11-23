// Hàm dùng chung giữa các controller: tồn kho, hiển thị sản phẩm, kiểm tra định dạng
const { db } = require('./db');
const { now } = require('./util');
const PHONE = /^0\d{9,10}$/, EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/, DATE = /^\d{4}-\d{2}-\d{2}$/;

// TonKho.congSoLuong(): đổi số lượng tồn và chuyển trạng thái tồn (ChuaCoTon -> ConHang <-> HetHang)
function capNhatTon(d, maSP, delta) {
  const t = d.tonkho.find(x => x.maSP === maSP);
  t.soLuongTon += delta; t.capNhatLuc = now();
  if (t.soLuongTon > 0) t.trangThai = 'Còn hàng';
  else if (t.trangThai === 'Còn hàng') t.trangThai = 'Hết hàng';
}
const tonCua = (d, maSP) => d.tonkho.find(x => x.maSP === maSP) || { soLuongTon: 0, trangThai: 'Chưa có tồn' };
function spView(d, sp) {
  const t = tonCua(d, sp.maSP);
  return { ...sp, soLuongTon: t.soLuongTon, trangThaiTon: t.trangThai, tenDM: (d.danhmuc.find(x => x.maDM === sp.maDM) || {}).tenDM || '', tenKho: (d.kho.find(x => x.maKho === sp.maKho) || {}).tenKho || '' };
}
const tenNV = (d, ma) => (d.nhanvien.find(n => n.maNV === ma) || {}).hoTen || '';
const tenKH = (d, ma) => (d.khachhang.find(n => n.maKH === ma) || {}).hoTen || '';
const hasErr = e => Object.keys(e).length > 0;
module.exports = { db, PHONE, EMAIL, DATE, capNhatTon, tonCua, spView, tenNV, tenKH, hasErr };
