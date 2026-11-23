// CHỨC NĂNG 2 – THÊM HÀNG VÀO KHO (Thào A Bảy)
// Vòng đời PhieuNhap theo sơ đồ trạng thái 5.2:  Nháp --(Chọn lưu)--> Đang kiểm tra --(hợp lệ & lưu thành công)--> Đã ghi nhận
//                                               Đang kiểm tra --(dữ liệu không hợp lệ)--> Nháp ; Nháp --(Nhân viên hủy phiếu)--> Đã hủy
const { db, transaction, nextCode } = require('./db');
const { bad, notFound, str, num, now } = require('./util');
const { capNhatTon, tenNV, hasErr } = require('./core');

const NHAP = 'Nháp', KIEM = 'Đang kiểm tra', GHI = 'Đã ghi nhận', HUY = 'Đã hủy';
const view = (d, p) => ({ ...p, tenNV: tenNV(d, p.maNV), tenNCC: (d.nhacungcap.find(n => n.maNCC === p.maNCC) || {}).tenNCC || '', chiTiet: d.chitietphieunhap.filter(c => c.maPN === p.maPN).map(c => ({ ...c, tenSP: (d.sanpham.find(s => s.maSP === c.maSP) || {}).tenSP })) });

const PhieuNhapController = {
  danhSach: () => { const d = db(); return d.phieunhap.map(p => view(d, p)).reverse(); },
  chiTiet(ma) { const d = db(), p = d.phieunhap.find(x => x.maPN === ma); if (!p) throw notFound('Không tìm thấy phiếu nhập'); return view(d, p); },
  // Bước 1-2: "Bắt đầu lập phiếu" -> phiếu ở trạng thái Nháp
  batDau(user) {
    return transaction(d => { const p = { maPN: nextCode('PN', 5), ngayNhap: now(), trangThai: NHAP, tongTien: 0, ghiChu: '', maNV: user.maNV, maNCC: null }; d.phieunhap.push(p); return view(d, p); });
  },
  // Bước 7: tính thành tiền từng dòng (ChiTietPhieuNhap.tinhThanhTien) và tổng tiền (PhieuNhap.tinhTongTien)
  tinhThanhTien: l => num(l.soLuong) * num(l.donGia),
  // Bước 8-11: chọn Lưu phiếu nhập
  luu(ma, b) {
    const d = db(), p = d.phieunhap.find(x => x.maPN === ma); if (!p) throw notFound('Không tìm thấy phiếu nhập');
    if (p.trangThai !== NHAP) throw bad(`Phiếu đang ở trạng thái "${p.trangThai}", không thể lưu`);
    const dong = Array.isArray(b.dong) ? b.dong : [];
    // Đang kiểm tra: kiểm tra dữ liệu (9a, 9b, 9c). Nếu sai: quay lại Nháp (không đổi dữ liệu nào)
    const loi = (() => {
      if (!d.nhacungcap.some(n => n.maNCC === b.maNCC) || !dong.length || dong.some(l => !d.sanpham.some(s => s.maSP === l.maSP))) return 'Thiếu thông tin bắt buộc: cần chọn nhà cung cấp và sản phẩm cho từng dòng';  // 9a
      if (dong.some(l => !Number.isInteger(num(l.soLuong)) || num(l.soLuong) <= 0)) return 'Số lượng phải lớn hơn 0';                                   // 9b
      if (dong.some(l => isNaN(num(l.donGia)) || num(l.donGia) < 0)) return 'Đơn giá phải lớn hơn hoặc bằng 0';                                         // 9c
      return '';
    })();
    if (loi) throw bad(loi);
    return transaction(d => {
      p.trangThai = KIEM;
      p.maNCC = b.maNCC; p.ghiChu = str(b.ghiChu); p.ngayNhap = now();
      dong.forEach(l => {
        const thanhTien = this.tinhThanhTien(l);
        d.chitietphieunhap.push({ maChiTiet: nextCode('CTPN', 6), maPN: ma, maSP: l.maSP, soLuong: num(l.soLuong), donGia: num(l.donGia), thanhTien });
        capNhatTon(d, l.maSP, num(l.soLuong));                       // Tồn kho: congSoLuong(soLuong); ChuaCoTon/HetHang -> ConHang
      });
      p.tongTien = d.chitietphieunhap.filter(c => c.maPN === ma).reduce((s, c) => s + c.thanhTien, 0);
      p.trangThai = GHI;                                             // xacNhan()
      return view(d, p);
    });
  },
  // "Nhân viên hủy thao tác trước khi lưu": Nháp -> Đã hủy, không thay đổi tồn kho
  huy(ma) {
    const p = db().phieunhap.find(x => x.maPN === ma); if (!p) throw notFound('Không tìm thấy phiếu nhập');
    if (p.trangThai !== NHAP) throw bad(`Phiếu đang ở trạng thái "${p.trangThai}", không thể hủy`);
    return transaction(d => { p.trangThai = HUY; return view(d, p); });
  },
};
module.exports = { PhieuNhapController };
