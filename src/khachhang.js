// CHỨC NĂNG 1 – THÊM MỚI KHÁCH HÀNG (Nguyễn Quang Huy) + quản lý khách hàng / thẻ thành viên
// Bám theo biểu đồ trình tự 4.1: FormThemKhachHang -> KhachHangController.themKhachHang -> kiemTraHopLe -> KhachHangDAO -> CSDL
const { db, transaction, nextCode } = require('./db');
const { HttpError, bad, notFound, str, today } = require('./util');
const { PHONE, EMAIL, hasErr } = require('./core');

// ---- DAO ----
const KhachHangDAO = {
  timTheoSoDienThoai: sdt => db().khachhang.find(k => k.soDienThoai === sdt) || null,
  them: kh => { db().khachhang.push(kh); return true; },
};
const theHienTai = (d, maKH) => d.thethanhvien.find(t => t.maKH === maKH && t.trangThai !== 'Hủy thẻ') || null;
const view = (d, k) => ({ ...k, theThanhVien: theHienTai(d, k.maKH) });

// Sơ đồ trạng thái lớp TheThanhVien: sự kiện kích hoạt từng chuyển trạng thái
const CHUYEN_THE = {
  'Hiệu lực': { 'Bị khóa': 'Báo mất hoặc vi phạm', 'Hết hạn': 'Quá ngày hết hạn', 'Hủy thẻ': 'Hủy thẻ' },
  'Bị khóa': { 'Hiệu lực': 'Mở khóa hoặc cấp lại', 'Hủy thẻ': 'Hủy thẻ' },
  'Hết hạn': { 'Hiệu lực': 'Gia hạn' },
};
// Sơ đồ trạng thái lớp KhachHang
const CHUYEN_KH = { 'Hoạt động': ['Tạm khóa', 'Ngừng hoạt động'], 'Tạm khóa': ['Hoạt động', 'Ngừng hoạt động'], 'Ngừng hoạt động': [] };

const KhachHangController = {
  // Bước 4: kiểm tra trường bắt buộc (họ tên, SĐT) và định dạng (SĐT, email)
  kiemTraHopLe(b) {
    const e = {};
    if (!str(b.hoTen)) e.hoTen = 'Vui lòng nhập họ tên (bắt buộc)';
    if (!str(b.soDienThoai)) e.soDienThoai = 'Vui lòng nhập số điện thoại (bắt buộc)';
    else if (!PHONE.test(str(b.soDienThoai))) e.soDienThoai = 'Số điện thoại sai định dạng';
    if (str(b.email) && !EMAIL.test(str(b.email))) e.email = 'Email sai định dạng';
    if (str(b.gioiTinh) && !['Nam', 'Nữ', 'Khác'].includes(b.gioiTinh)) e.gioiTinh = 'Giới tính không hợp lệ';
    if (str(b.ngaySinh) && (!/^\d{4}-\d{2}-\d{2}$/.test(b.ngaySinh) || b.ngaySinh > today())) e.ngaySinh = 'Ngày sinh không hợp lệ';
    return e;
  },
  danhSach(q) {
    const d = db(), k = str(q.q).toLowerCase();
    return d.khachhang.filter(c => !k || [c.maKH, c.hoTen, c.soDienThoai, c.email].join(' ').toLowerCase().includes(k)).map(c => view(d, c)).reverse();
  },
  chiTiet(ma) {
    const d = db(), c = d.khachhang.find(x => x.maKH === ma.toUpperCase() || x.soDienThoai === ma);
    if (!c) throw notFound('Không tìm thấy khách hàng');
    return view(d, c);
  },
  // themKhachHang(khachHang)
  themKhachHang(b, user) {
    const errors = this.kiemTraHopLe(b);
    if (hasErr(errors)) throw bad('Dữ liệu không hợp lệ, vui lòng nhập lại', { errors });                 // alt [Dữ liệu không hợp lệ]
    const cu = KhachHangDAO.timTheoSoDienThoai(str(b.soDienThoai));                                          // bước 5
    if (cu) throw new HttpError(409, 'Khách hàng đã tồn tại', { khachHangCu: cu });                         // alt [Số điện thoại đã tồn tại]
    return transaction(d => {
      const kh = {                                                                                          // bước 6
        maKH: nextCode('KH'), hoTen: str(b.hoTen), gioiTinh: str(b.gioiTinh) || 'Nam', ngaySinh: str(b.ngaySinh), soDienThoai: str(b.soDienThoai),
        email: str(b.email), diaChi: str(b.diaChi), ngayDangKy: today(), diemTichLuy: 0, trangThai: 'Hoạt động', maNV: user.maNV,
      };
      KhachHangDAO.them(kh);
      if (b.capThe) this.capThe(d, kh.maKH);                                                               // use case mở rộng "Cấp thẻ thành viên" (6b)
      return view(d, kh);
    });
  },
  capThe(d, maKH) {
    const t = { maThe: nextCode('THE', 5), maKH, ngayCap: today(), hangThe: 'Thường', trangThai: 'Hiệu lực' };
    d.thethanhvien.push(t); return t;
  },
  capTheChoKhach(ma) {
    const k = this.chiTiet(ma);
    if (k.theThanhVien) throw bad('Khách hàng đã có thẻ thành viên');
    return transaction(d => { this.capThe(d, k.maKH); return view(d, k); });
  },
  // Sửa thông tin khách hàng (số điện thoại vẫn phải duy nhất)
  capNhat(ma, b) {
    const d = db(), c = d.khachhang.find(x => x.maKH === ma); if (!c) throw notFound('Không tìm thấy khách hàng');
    const errors = this.kiemTraHopLe(b);
    if (!errors.soDienThoai && d.khachhang.some(k => k !== c && k.soDienThoai === str(b.soDienThoai))) errors.soDienThoai = 'Số điện thoại đã thuộc về khách hàng khác';
    if (hasErr(errors)) throw bad('Dữ liệu không hợp lệ, vui lòng nhập lại', { errors });
    return transaction(() => { Object.assign(c, { hoTen: str(b.hoTen), gioiTinh: str(b.gioiTinh) || c.gioiTinh, ngaySinh: str(b.ngaySinh), soDienThoai: str(b.soDienThoai), email: str(b.email), diaChi: str(b.diaChi) }); return view(d, c); });
  },
  doiTrangThai(ma, b) {
    const c = db().khachhang.find(x => x.maKH === ma); if (!c) throw notFound('Không tìm thấy khách hàng');
    if (!CHUYEN_KH[c.trangThai].includes(b.trangThai)) throw bad(`Không thể chuyển từ "${c.trangThai}" sang "${b.trangThai}"`);
    return transaction(() => { c.trangThai = b.trangThai; return c; });
  },
  doiTrangThaiThe(ma, b) {
    const d = db(), t = theHienTai(d, ma); if (!t) throw notFound('Khách hàng chưa có thẻ thành viên');
    if (!CHUYEN_THE[t.trangThai] || !CHUYEN_THE[t.trangThai][b.trangThai]) throw bad(`Không thể chuyển thẻ từ "${t.trangThai}" sang "${b.trangThai}"`);
    return transaction(() => { t.trangThai = b.trangThai; return t; });
  },
  chuyenTheHopLe: () => CHUYEN_THE,
};
module.exports = { KhachHangController, KhachHangDAO };
