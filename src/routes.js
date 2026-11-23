// Bảng định tuyến API + phân quyền theo biểu đồ use case tổng quát
const C = { ...require('./catalog'), ...require('./khachhang'), ...require('./phieunhap'), ...require('./hoadon'), ...require('./khuyenmai'), ...require('./thongke') };
const { HttpError } = require('./util');
const QT = 'QUAN_TRI', QL = 'QUAN_LY', BH = 'BAN_HANG', KHO = 'KHO', KH = 'KHACH_HANG';
const NV = [QT, QL, BH, KHO];                      // mọi nhân viên
const R = [];
const route = (m, p, roles, fn) => R.push({ m, roles, fn, re: new RegExp('^' + p.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$') });
const crudRoutes = (base, ctl, write, read) => {
  route('GET', base, read, ({ query }) => ctl.danhSach(query)); route('POST', base, write, ({ body }) => ctl.them(body));
  route('PUT', base + '/:ma', write, ({ params, body }) => ctl.sua(params.ma, body)); route('DELETE', base + '/:ma', write, ({ params }) => ctl.xoa(params.ma));
};

// Đăng nhập
route('POST', '/api/login', null, ({ body }) => C.AuthController.dangNhap(body));
route('POST', '/api/logout', [...NV, KH], ({ token }) => C.AuthController.dangXuat(token));
route('GET', '/api/me', [...NV, KH], ({ user }) => user);
route('POST', '/api/doimatkhau', [...NV, KH], ({ body, user }) => C.AuthController.doiMatKhau(body, user));

// Quản lý danh mục sản phẩm (Quản trị viên) · Kho (Quản lý, Nhân viên kho) · Nhà cung cấp (Quản trị viên, Nhân viên kho)
crudRoutes('/api/danhmuc', C.DanhMucController, [QT], NV);
crudRoutes('/api/kho', C.KhoController, [QL, KHO], NV);
crudRoutes('/api/nhacungcap', C.NhaCungCapController, [QT, KHO], NV);

// Quản lý nhân viên và tài khoản (Quản trị viên, Quản lý)
route('GET', '/api/nhanvien', [QT, QL], ({ query }) => C.NhanVienController.danhSach(query));
route('POST', '/api/nhanvien', [QT, QL], ({ body }) => C.NhanVienController.them(body));
route('PUT', '/api/nhanvien/:ma', [QT, QL], ({ params, body }) => C.NhanVienController.sua(params.ma, body));
route('PATCH', '/api/nhanvien/:ma/trangthai', [QT, QL], ({ params, body, user }) => C.NhanVienController.doiTrangThai(params.ma, body, user));
route('POST', '/api/nhanvien/:ma/matkhau', [QT, QL], ({ params, body }) => C.NhanVienController.datLaiMatKhau(params.ma, body));

// Quản lý sản phẩm (Quản trị viên, Quản lý, Nhân viên kho)
route('GET', '/api/sanpham', NV, ({ query }) => C.SanPhamController.danhSach(query));
route('POST', '/api/sanpham', [QT, QL, KHO], ({ body }) => C.SanPhamController.them(body));
route('PUT', '/api/sanpham/:ma', [QT, QL, KHO], ({ params, body }) => C.SanPhamController.sua(params.ma, body));
route('PATCH', '/api/sanpham/:ma/kinhdoanh', [QT, QL, KHO], ({ params, body }) => C.SanPhamController.doiKinhDoanh(params.ma, body));
route('DELETE', '/api/sanpham/:ma', [QT, QL, KHO], ({ params }) => C.SanPhamController.xoa(params.ma));

// 1. Khách hàng (Nhân viên bán hàng, Quản lý)
const KHG = [BH, QL];
route('GET', '/api/khachhang', KHG, ({ query }) => C.KhachHangController.danhSach(query));
route('POST', '/api/khachhang', KHG, ({ body, user }) => C.KhachHangController.themKhachHang(body, user));
route('GET', '/api/khachhang/:ma', KHG, ({ params }) => C.KhachHangController.chiTiet(decodeURIComponent(params.ma)));
route('PUT', '/api/khachhang/:ma', KHG, ({ params, body }) => C.KhachHangController.capNhat(params.ma, body));
route('PATCH', '/api/khachhang/:ma/trangthai', KHG, ({ params, body }) => C.KhachHangController.doiTrangThai(params.ma, body));
route('POST', '/api/khachhang/:ma/the', KHG, ({ params }) => C.KhachHangController.capTheChoKhach(params.ma));
route('PATCH', '/api/khachhang/:ma/the', KHG, ({ params, body }) => C.KhachHangController.doiTrangThaiThe(params.ma, body));
route('GET', '/api/toi', [KH], ({ user }) => C.KhachHangController.chiTiet(user.maKH));
route('GET', '/api/chuyenthe', KHG, () => C.KhachHangController.chuyenTheHopLe());

// 2. Nhập hàng và kho (Quản lý, Nhân viên kho)
const KT = [QL, KHO];
route('GET', '/api/phieunhap', KT, () => C.PhieuNhapController.danhSach());
route('POST', '/api/phieunhap', KT, ({ user }) => C.PhieuNhapController.batDau(user));
route('GET', '/api/phieunhap/:ma', KT, ({ params }) => C.PhieuNhapController.chiTiet(params.ma));
route('POST', '/api/phieunhap/:ma/luu', KT, ({ params, body }) => C.PhieuNhapController.luu(params.ma, body));
route('POST', '/api/phieunhap/:ma/huy', KT, ({ params }) => C.PhieuNhapController.huy(params.ma));

// 3. Hóa đơn (Nhân viên bán hàng, Quản lý; khách hàng chỉ xem hóa đơn của mình)
const HD = [BH, QL], hd = C.HoaDonController;
route('GET', '/api/hoadon', [...HD, KH], ({ user }) => hd.danhSach(user));
route('POST', '/api/hoadon', HD, ({ user }) => hd.taoHoaDon(user));
route('GET', '/api/hoadon/:ma', [...HD, KH], ({ params, user }) => hd.chiTiet(params.ma, user));
route('PUT', '/api/hoadon/:ma/khachhang', HD, ({ params, body }) => hd.timKhachHang(params.ma, body));
route('POST', '/api/hoadon/:ma/sanpham', HD, ({ params, body }) => hd.themSanPham(params.ma, body));
route('PUT', '/api/hoadon/:ma/sanpham/:sp', HD, ({ params, body }) => hd.capNhatSoLuong(params.ma, params.sp, body));
route('DELETE', '/api/hoadon/:ma/sanpham/:sp', HD, ({ params }) => hd.xoaSanPham(params.ma, params.sp));
route('PUT', '/api/hoadon/:ma/khuyenmai', HD, ({ params, body }) => hd.apDungKhuyenMai(params.ma, body));
route('POST', '/api/hoadon/:ma/xacnhan', HD, ({ params }) => hd.xacNhanHoaDon(params.ma));
route('POST', '/api/hoadon/:ma/sualai', HD, ({ params }) => hd.suaLai(params.ma));
route('POST', '/api/hoadon/:ma/thanhtoan', HD, ({ params, body }) => hd.thanhToan(params.ma, body));
route('POST', '/api/hoadon/:ma/huy', HD, ({ params }) => hd.huy(params.ma));
route('GET', '/api/hoadon/:ma/xuat', HD, ({ params }) => hd.xuatHoaDon(params.ma));

// 4. Khuyến mãi (Quản lý ghi; Nhân viên bán hàng, Khách hàng chỉ xem)
const km = C.KhuyenMaiController;
route('GET', '/api/loaigiamgia', [...NV, KH], () => km.loaiGiamGia());
route('GET', '/api/khuyenmai', [QT, QL, BH, KH], ({ query }) => km.danhSach(query));
route('POST', '/api/khuyenmai', [QL], ({ body, user }) => km.them(body, user));
route('GET', '/api/khuyenmai/:ma', [QT, QL, BH, KH], ({ params }) => km.chiTiet(params.ma));
route('PUT', '/api/khuyenmai/:ma', [QL], ({ params, body }) => km.capNhat(params.ma, body));
route('DELETE', '/api/khuyenmai/:ma', [QL], ({ params }) => km.xoa(params.ma));
route('PUT', '/api/khuyenmai/:ma/sanpham', [QL], ({ params, body }) => km.capNhatSanPham(params.ma, body));
route('POST', '/api/khuyenmai/:ma/ngung', [QL], ({ params }) => km.ngungApDung(params.ma));

// Thống kê và báo cáo (Quản trị viên, Quản lý)
route('GET', '/api/thongke', [QT, QL], ({ query }) => C.ThongKeController.baoCao(query));

module.exports = async function dispatch(req, pathname, query, body, token) {
  const matched = R.filter(r => r.re.test(pathname));
  if (!matched.length) throw new HttpError(404, 'Không tìm thấy API');
  const r = matched.find(x => x.m === req.method);
  if (!r) throw new HttpError(405, 'Phương thức không được hỗ trợ');
  let user = null;
  if (r.roles) {
    user = C.AuthController.userFromToken(token);
    if (!user) throw new HttpError(401, 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại');
    if (!r.roles.includes(user.quyen)) throw new HttpError(403, 'Bạn không có quyền thực hiện chức năng này');
  }
  return r.fn({ params: r.re.exec(pathname).groups || {}, query, body, user, token });
};
