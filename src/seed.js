// Dữ liệu mẫu để chạy thử ngay
const { hashPw, newSalt, addDays, today } = require('./util');
const Q = { QT: 'QUAN_TRI', QL: 'QUAN_LY', BH: 'BAN_HANG', KHO: 'KHO', KH: 'KHACH_HANG' };
const tk = (maTK, maNV, maKH, tenDangNhap, mk, quyen) => { const salt = newSalt(); return { maTK, maNV, maKH, tenDangNhap, salt, matKhau: hashPw(mk, salt), quyen }; };

module.exports = () => {
  const d = {
    counters: { NV: 4, TK: 5, DM: 4, KHO: 1, NCC: 2, KH: 2, THE: 0, TON: 8, PN: 0, CTPN: 0, HD: 0, CTHD: 0 },
    nhanvien: [
      { maNV: 'NV0001', hoTen: 'Nguyễn Quản Trị', soDienThoai: '0900000001', chucVu: 'Quản trị viên', trangThai: true },
      { maNV: 'NV0002', hoTen: 'Lê Quản Lý', soDienThoai: '0900000002', chucVu: 'Quản lý', trangThai: true },
      { maNV: 'NV0003', hoTen: 'Phạm Bán Hàng', soDienThoai: '0900000003', chucVu: 'Nhân viên bán hàng', trangThai: true },
      { maNV: 'NV0004', hoTen: 'Trần Thủ Kho', soDienThoai: '0900000004', chucVu: 'Nhân viên kho', trangThai: true },
    ],
    taikhoan: [
      tk('TK0001', 'NV0001', null, 'admin', 'admin123', Q.QT), tk('TK0002', 'NV0002', null, 'quanly', '123456', Q.QL),
      tk('TK0003', 'NV0003', null, 'banhang', '123456', Q.BH), tk('TK0004', 'NV0004', null, 'kho', '123456', Q.KHO),
      tk('TK0005', null, 'KH0001', 'khachhang', '123456', Q.KH),
    ],
    danhmuc: [['DM0001', 'Lương thực - Thực phẩm khô'], ['DM0002', 'Đồ uống'], ['DM0003', 'Hóa phẩm - Gia dụng'], ['DM0004', 'Thực phẩm tươi']].map(([maDM, tenDM]) => ({ maDM, tenDM })),
    kho: [{ maKho: 'KHO0001', tenKho: 'Kho trung tâm', diaChi: 'Số 1, Đường Siêu Thị, Hà Nội' }],
    nhacungcap: [
      { maNCC: 'NCC0001', tenNCC: 'Công ty Thực phẩm Việt', soDienThoai: '0241111111', diaChi: 'Hà Nội', email: 'lienhe@thucphamviet.vn' },
      { maNCC: 'NCC0002', tenNCC: 'Đại lý Nước giải khát Hà Nội', soDienThoai: '0242222222', diaChi: 'Hà Nội', email: 'daily@nuocgk.vn' },
    ],
    sanpham: [], tonkho: [],
    khachhang: [
      { maKH: 'KH0001', hoTen: 'Nguyễn Văn An', gioiTinh: 'Nam', ngaySinh: '1995-05-20', soDienThoai: '0901234567', email: 'an@example.com', diaChi: 'Hà Nội', ngayDangKy: today(), diemTichLuy: 0, trangThai: 'Hoạt động', maNV: 'NV0003' },
      { maKH: 'KH0002', hoTen: 'Trần Thị Bình', gioiTinh: 'Nữ', ngaySinh: '1998-11-02', soDienThoai: '0912345678', email: '', diaChi: 'Hà Nội', ngayDangKy: today(), diemTichLuy: 0, trangThai: 'Hoạt động', maNV: 'NV0003' },
    ],
    thethanhvien: [], phieunhap: [], chitietphieunhap: [], hoadon: [], chitiethoadon: [],
    loaigiamgia: [{ maLoai: 'PT', tenLoai: 'Phần trăm' }, { maLoai: 'ST', tenLoai: 'Số tiền cố định' }],
    trangthai: ['Đã lưu', 'Chưa bắt đầu', 'Đang diễn ra', 'Đã kết thúc', 'Ngừng áp dụng', 'Đã hủy'].map((tenTrangThai, i) => ({ maTrangThai: 'TT' + (i + 1), tenTrangThai })),
    khuyenmai: [{ maKM: 'KM001', tenChuongTrinh: 'Giảm 10% đồ uống', moTa: 'Áp dụng cho sữa và nước suối', maLoai: 'PT', giaTriGiam: 10, ngayBatDau: addDays(-5), ngayKetThuc: addDays(25), maTrangThai: 'TT3', nguoiTao: 'NV0002', ngayTao: new Date().toISOString() }],
    chitietkhuyenmai: [{ maKM: 'KM001', maSP: 'SP0003', ghiChu: '', trangThai: 'Đang áp dụng' }, { maKM: 'KM001', maSP: 'SP0004', ghiChu: '', trangThai: 'Đang áp dụng' }],
  };
  [['SP0001', 'Gạo ST25 5kg', 'DM0001', 'Bao', 145000, 50], ['SP0002', 'Mì Hảo Hảo tôm chua cay', 'DM0001', 'Gói', 4500, 300], ['SP0003', 'Sữa tươi Vinamilk 1L', 'DM0002', 'Hộp', 32000, 120],
   ['SP0004', 'Nước suối Aquafina 500ml', 'DM0002', 'Chai', 6000, 200], ['SP0005', 'Dầu ăn Neptune 1L', 'DM0001', 'Chai', 52000, 60], ['SP0006', 'Trứng gà (vỉ 10 quả)', 'DM0004', 'Vỉ', 38000, 40],
   ['SP0007', 'Bánh Oreo', 'DM0001', 'Gói', 18000, 80], ['SP0008', 'Bột giặt OMO 3kg', 'DM0003', 'Túi', 165000, 8]].forEach(([maSP, tenSP, maDM, donViTinh, donGia, ton], i) => {
    d.sanpham.push({ maSP, tenSP, maDM, maKho: 'KHO0001', donViTinh, moTa: '', donGia, dangKinhDoanh: true, trangThaiKM: ['SP0003', 'SP0004'].includes(maSP) ? 'Đang áp dụng khuyến mãi' : 'Bình thường' });
    d.tonkho.push({ maTonKho: 'TON' + String(i + 1).padStart(4, '0'), maSP, soLuongTon: ton, capNhatLuc: new Date().toISOString(), trangThai: 'Còn hàng' });
  });
  // Vài hóa đơn đã thanh toán ở các ngày trước để trang Thống kê có số liệu
  [[3, 'KH0001', [['SP0001', 1], ['SP0003', 2]]], [2, null, [['SP0002', 10], ['SP0007', 3]]], [1, 'KH0002', [['SP0005', 1], ['SP0004', 6]]], [0, null, [['SP0006', 2]]]].forEach(([ago, maKH, lines], i) => {
    const maHD = 'HD' + String(++d.counters.HD).padStart(6, '0'); let tong = 0;
    lines.forEach(([maSP, soLuong]) => { const sp = d.sanpham.find(s => s.maSP === maSP); const tt = soLuong * sp.donGia; tong += tt; d.chitiethoadon.push({ maCTHD: 'CTHD' + String(++d.counters.CTHD).padStart(6, '0'), maHD, maSP, soLuong, donGia: sp.donGia, thanhTien: tt }); });
    d.hoadon.push({ maHD, ngayLap: new Date(Date.now() - ago * 864e5).toISOString(), tongTien: tong, tienGiam: 0, trangThai: 'Đã thanh toán', ngayThanhToan: new Date(Date.now() - ago * 864e5).toISOString(), phuongThuc: 'Tiền mặt', tienKhachDua: tong, tienThua: 0, maNV: 'NV0003', maKH, dsMaKM: [], kmBo: [], giamTheoKM: [] });
  });
  return d;
};
