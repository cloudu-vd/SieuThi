/* ============ MENU THEO QUYỀN + KHỞI ĐỘNG ============
   Quyền lấy từ biểu đồ use case tổng quát:
   Quản trị viên: danh mục, nhân viên & tài khoản, nhà cung cấp, sản phẩm, thống kê
   Quản lý: sản phẩm, thống kê, nhập hàng & kho, lập hóa đơn, nhân viên, khách hàng & khuyến mãi
   Nhân viên bán hàng: lập hóa đơn, khách hàng & khuyến mãi · Nhân viên kho: nhà cung cấp, sản phẩm, nhập hàng & kho · Khách hàng: xem thông tin, khuyến mãi, hóa đơn của mình */
const QT = 'QUAN_TRI', QL = 'QUAN_LY', BH = 'BAN_HANG', KHO = 'KHO', KH = 'KHACH_HANG';
const MENU = [
  { id: 'thongke', t: '📊 Thống kê & báo cáo', r: [QT, QL], f: pageThongKe },
  { id: 'khachhang', t: '👤 Khách hàng', r: [QL, BH], f: pageKhachHang },
  { id: 'khuyenmai', t: '🏷️ Khuyến mãi', r: [QL, BH, KH], f: pageKhuyenMai },
  { id: 'banhang', t: '🧾 Lập hóa đơn bán hàng', r: [QL, BH], f: pageBanHang },
  { id: 'hoadon', t: '📑 Hóa đơn', r: [QL, BH, KH], f: pageHoaDon },
  { id: 'nhapkho', t: '🚚 Nhập hàng vào kho', r: [QL, KHO], f: pageNhapKho },
  { id: 'sanpham', t: '📦 Sản phẩm & tồn kho', r: [QT, QL, BH, KHO], f: pageSanPham },
  { id: 'kho', t: '🏬 Kho', r: [QL, KHO], f: pageKho },
  { id: 'danhmuc', t: '🗂️ Danh mục sản phẩm', r: [QT], f: pageDanhMuc },
  { id: 'nhacungcap', t: '🏭 Nhà cung cấp', r: [QT, KHO], f: pageNCC },
  { id: 'nhanvien', t: '👥 Nhân viên & tài khoản', r: [QT, QL], f: pageNhanVien },
  { id: 'toi', t: '🙋 Thông tin của tôi', r: [KH], f: pageToi },
];
(async () => {
  if (token) { try { user = await api('GET', '/me'); return renderApp(); } catch {} }
  renderLogin();
})();
