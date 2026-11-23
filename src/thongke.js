// THỐNG KÊ VÀ BÁO CÁO: doanh thu, sản phẩm bán chạy, chi phí nhập hàng, tồn kho cảnh báo, khách hàng mua nhiều
const { db } = require('./db');
const { str, today, addDays } = require('./util');
const dayOf = iso => new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

const ThongKeController = {
  baoCao(q) {
    const d = db(), den = str(q.den) || today(), tu = str(q.tu) || addDays(-29);
    const inRange = iso => { const x = dayOf(iso); return x >= tu && x <= den; };
    const ngayBan = h => h.ngayThanhToan || h.ngayLap;   // doanh thu tính theo ngày thanh toán
    const hd = d.hoadon.filter(h => ['Đã thanh toán', 'Đã xuất'].includes(h.trangThai) && inRange(ngayBan(h)));
    const theoNgay = {}; hd.forEach(h => { const k = dayOf(ngayBan(h)); theoNgay[k] = theoNgay[k] || { ngay: k, soHoaDon: 0, doanhThu: 0 }; theoNgay[k].soHoaDon++; theoNgay[k].doanhThu += h.tongTien; });
    const sp = {}; d.chitiethoadon.filter(c => hd.some(h => h.maHD === c.maHD)).forEach(c => { sp[c.maSP] = sp[c.maSP] || { maSP: c.maSP, tenSP: (d.sanpham.find(s => s.maSP === c.maSP) || {}).tenSP, soLuong: 0, doanhThu: 0 }; sp[c.maSP].soLuong += c.soLuong; sp[c.maSP].doanhThu += c.thanhTien; });
    const kh = {}; hd.filter(h => h.maKH).forEach(h => { kh[h.maKH] = kh[h.maKH] || { maKH: h.maKH, hoTen: (d.khachhang.find(k => k.maKH === h.maKH) || {}).hoTen, soHoaDon: 0, tongChi: 0 }; kh[h.maKH].soHoaDon++; kh[h.maKH].tongChi += h.tongTien; });
    const pn = d.phieunhap.filter(p => p.trangThai === 'Đã ghi nhận' && inRange(p.ngayNhap));
    return {
      tu, den, soHoaDon: hd.length, doanhThu: hd.reduce((s, h) => s + h.tongTien, 0), tongGiamGia: hd.reduce((s, h) => s + h.tienGiam, 0),
      soPhieuNhap: pn.length, chiPhiNhap: pn.reduce((s, p) => s + p.tongTien, 0),
      theoNgay: Object.values(theoNgay).sort((a, b) => a.ngay.localeCompare(b.ngay)),
      banChay: Object.values(sp).sort((a, b) => b.soLuong - a.soLuong).slice(0, 10),
      khachHang: Object.values(kh).sort((a, b) => b.tongChi - a.tongChi).slice(0, 10),
      tonKhoCanhBao: d.tonkho.filter(t => t.soLuongTon <= 10).map(t => ({ maSP: t.maSP, tenSP: (d.sanpham.find(s => s.maSP === t.maSP) || {}).tenSP, soLuongTon: t.soLuongTon, trangThai: t.trangThai })).sort((a, b) => a.soLuongTon - b.soLuongTon),
      tongSanPham: d.sanpham.length, tongKhachHang: d.khachhang.length,
    };
  },
};
module.exports = { ThongKeController };
