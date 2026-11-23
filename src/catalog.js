// Chức năng chung của hệ thống: Đăng nhập, Quản lý nhân viên & tài khoản, Danh mục, Kho, Nhà cung cấp, Sản phẩm
const { db, transaction, nextCode } = require('./db');
const U = require('./util');
const { HttpError, bad, notFound, str, num } = U;
const { PHONE, EMAIL, spView, hasErr } = require('./core');

const QUYEN = { 'Quản trị viên': 'QUAN_TRI', 'Quản lý': 'QUAN_LY', 'Nhân viên bán hàng': 'BAN_HANG', 'Nhân viên kho': 'KHO' };

// ---------- Đăng nhập (include của mọi chức năng) ----------
const sessions = new Map();
const AuthController = {
  userFromToken(t) {
    const tk = db().taikhoan.find(x => x.maTK === sessions.get(t)); if (!tk) return null;
    const nv = tk.maNV && db().nhanvien.find(n => n.maNV === tk.maNV), kh = tk.maKH && db().khachhang.find(k => k.maKH === tk.maKH);
    return { maTK: tk.maTK, quyen: tk.quyen, maNV: tk.maNV, maKH: tk.maKH, hoTen: (nv || kh || {}).hoTen || tk.tenDangNhap, chucVu: nv ? nv.chucVu : 'Khách hàng' };
  },
  dangNhap(b) {
    const tk = db().taikhoan.find(x => x.tenDangNhap === str(b.tenDangNhap));
    if (!tk || U.hashPw(String(b.matKhau || ''), tk.salt) !== tk.matKhau) throw new HttpError(401, 'Thông tin đăng nhập không hợp lệ, vui lòng đăng nhập lại');
    const nv = tk.maNV && db().nhanvien.find(n => n.maNV === tk.maNV), kh = tk.maKH && db().khachhang.find(k => k.maKH === tk.maKH);
    if ((nv && !nv.trangThai) || (kh && kh.trangThai !== 'Hoạt động')) throw new HttpError(403, 'Tài khoản đang bị khóa');
    const token = U.newToken(); sessions.set(token, tk.maTK);
    return { token, user: this.userFromToken(token) };
  },
  dangXuat: t => { sessions.delete(t); return { ok: true }; },
  doiMatKhau(b, user) {
    const tk = db().taikhoan.find(x => x.maTK === user.maTK), e = {};
    if (U.hashPw(String(b.matKhauCu || ''), tk.salt) !== tk.matKhau) e.matKhauCu = 'Mật khẩu hiện tại không đúng';
    if (String(b.matKhauMoi || '').length < 6) e.matKhauMoi = 'Mật khẩu mới tối thiểu 6 ký tự';
    if (hasErr(e)) throw bad('Dữ liệu không hợp lệ', { errors: e });
    return transaction(() => { tk.salt = U.newSalt(); tk.matKhau = U.hashPw(b.matKhauMoi, tk.salt); return { ok: true }; });
  },
};

// ---------- Khung CRUD dùng chung cho Danh mục / Kho / Nhà cung cấp ----------
function crud({ coll, key, prefix, search, validate, unique, usedBy }) {
  return {
    danhSach: q => { const k = str(q.q).toLowerCase(); return db()[coll].filter(x => !k || search.map(f => x[f]).join(' ').toLowerCase().includes(k)); },
    them(b) {
      const e = validate(b);
      if (unique && !e[unique] && db()[coll].some(x => x[unique].toLowerCase() === str(b[unique]).toLowerCase())) e[unique] = 'Đã tồn tại';
      if (hasErr(e)) throw bad('Dữ liệu không hợp lệ', { errors: e });
      return transaction(d => { const o = { [key]: nextCode(prefix) }; Object.keys(validate.fields).forEach(f => o[f] = str(b[f])); d[coll].push(o); return o; });
    },
    sua(ma, b) {
      const o = db()[coll].find(x => x[key] === ma); if (!o) throw notFound('Không tìm thấy dữ liệu');
      const e = validate(b);
      if (unique && !e[unique] && db()[coll].some(x => x !== o && x[unique].toLowerCase() === str(b[unique]).toLowerCase())) e[unique] = 'Đã tồn tại';
      if (hasErr(e)) throw bad('Dữ liệu không hợp lệ', { errors: e });
      return transaction(() => { Object.keys(validate.fields).forEach(f => o[f] = str(b[f])); return o; });
    },
    xoa(ma) {
      const o = db()[coll].find(x => x[key] === ma); if (!o) throw notFound('Không tìm thấy dữ liệu');
      const lyDo = usedBy(db(), ma); if (lyDo) throw bad(lyDo);
      return transaction(d => { d[coll].splice(d[coll].indexOf(o), 1); return { ok: true }; });
    },
  };
}
const mk = (fields, required, extra) => { const f = e => { const err = {}; required.forEach(r => { if (!str(e[r])) err[r] = 'Không được để trống'; }); if (extra) extra(e, err); return err; }; f.fields = fields; return f; };
const phoneEmail = (b, e) => { if (str(b.soDienThoai) && !PHONE.test(str(b.soDienThoai))) e.soDienThoai = 'Số điện thoại sai định dạng'; if (str(b.email) && !EMAIL.test(str(b.email))) e.email = 'Email sai định dạng'; };

const DanhMucController = crud({ coll: 'danhmuc', key: 'maDM', prefix: 'DM', search: ['maDM', 'tenDM'], unique: 'tenDM', validate: mk({ tenDM: 1 }, ['tenDM']),
  usedBy: (d, ma) => d.sanpham.some(s => s.maDM === ma) ? 'Danh mục đang có sản phẩm, không thể xóa' : '' });
const KhoController = crud({ coll: 'kho', key: 'maKho', prefix: 'KHO', search: ['maKho', 'tenKho', 'diaChi'], unique: 'tenKho', validate: mk({ tenKho: 1, diaChi: 1 }, ['tenKho']),
  usedBy: (d, ma) => d.sanpham.some(s => s.maKho === ma) ? 'Kho đang lưu trữ sản phẩm, không thể xóa' : '' });
const NhaCungCapController = crud({ coll: 'nhacungcap', key: 'maNCC', prefix: 'NCC', search: ['maNCC', 'tenNCC', 'soDienThoai', 'diaChi'], validate: mk({ tenNCC: 1, soDienThoai: 1, diaChi: 1, email: 1 }, ['tenNCC', 'soDienThoai'], phoneEmail),
  usedBy: (d, ma) => d.phieunhap.some(p => p.maNCC === ma) ? 'Nhà cung cấp đã có phiếu nhập, không thể xóa' : '' });

// ---------- Quản lý sản phẩm ----------
const SanPhamController = {
  kiemTra(b, moi) {
    const d = db(), e = {}, ma = str(b.maSP).toUpperCase();
    if (moi) { if (!ma) e.maSP = 'Vui lòng nhập mã sản phẩm'; else if (d.sanpham.some(s => s.maSP === ma)) e.maSP = 'Mã sản phẩm đã tồn tại'; }
    if (!str(b.tenSP)) e.tenSP = 'Vui lòng nhập tên sản phẩm';
    if (!str(b.donViTinh)) e.donViTinh = 'Vui lòng nhập đơn vị tính';
    if (isNaN(num(b.donGia)) || num(b.donGia) < 0) e.donGia = 'Giá bán phải là số lớn hơn hoặc bằng 0';
    if (!d.danhmuc.some(x => x.maDM === b.maDM)) e.maDM = 'Vui lòng chọn danh mục';
    if (!d.kho.some(x => x.maKho === b.maKho)) e.maKho = 'Vui lòng chọn kho';
    return e;
  },
  danhSach(q) {
    const d = db(), k = str(q.q).toLowerCase();
    return d.sanpham.filter(s => (!k || (s.maSP + ' ' + s.tenSP).toLowerCase().includes(k)) && (!q.maDM || s.maDM === q.maDM)).map(s => {
      const km = d.khuyenmai.find(m => m.maTrangThai === 'TT3' && d.chitietkhuyenmai.some(c => c.maKM === m.maKM && c.maSP === s.maSP && c.trangThai !== 'Đã hủy'));
      return { ...spView(d, s), khuyenMai: km ? km.tenChuongTrinh : '' };
    });
  },
  // Sản phẩm mới luôn có bản ghi TonKho ở trạng thái "Chưa có tồn"
  them(b) {
    const e = this.kiemTra(b, true); if (hasErr(e)) throw bad('Thông tin sản phẩm không hợp lệ', { errors: e });
    return transaction(d => {
      const sp = { maSP: str(b.maSP).toUpperCase(), tenSP: str(b.tenSP), maDM: b.maDM, maKho: b.maKho, donViTinh: str(b.donViTinh), moTa: str(b.moTa), donGia: num(b.donGia), dangKinhDoanh: true, trangThaiKM: 'Bình thường' };
      d.sanpham.push(sp); d.tonkho.push({ maTonKho: nextCode('TON'), maSP: sp.maSP, soLuongTon: 0, capNhatLuc: U.now(), trangThai: 'Chưa có tồn' });
      return spView(d, sp);
    });
  },
  sua(ma, b) {
    const sp = db().sanpham.find(s => s.maSP === ma); if (!sp) throw notFound('Sản phẩm không tồn tại');
    const e = this.kiemTra(b, false); if (hasErr(e)) throw bad('Thông tin sản phẩm không hợp lệ', { errors: e });
    return transaction(d => { Object.assign(sp, { tenSP: str(b.tenSP), maDM: b.maDM, maKho: b.maKho, donViTinh: str(b.donViTinh), moTa: str(b.moTa), donGia: num(b.donGia) }); return spView(d, sp); });
  },
  doiKinhDoanh(ma, b) {
    const sp = db().sanpham.find(s => s.maSP === ma); if (!sp) throw notFound('Sản phẩm không tồn tại');
    return transaction(d => { sp.dangKinhDoanh = !!b.dangKinhDoanh; return spView(d, sp); });
  },
  xoa(ma) {
    const d = db(), sp = d.sanpham.find(s => s.maSP === ma); if (!sp) throw notFound('Sản phẩm không tồn tại');
    if (d.chitietphieunhap.some(c => c.maSP === ma) || d.chitiethoadon.some(c => c.maSP === ma) || d.chitietkhuyenmai.some(c => c.maSP === ma)) throw bad('Sản phẩm đã phát sinh giao dịch, chỉ có thể ngừng kinh doanh');
    return transaction(d => { d.sanpham.splice(d.sanpham.indexOf(sp), 1); d.tonkho = d.tonkho.filter(t => t.maSP !== ma); return { ok: true }; });
  },
};

// ---------- Quản lý nhân viên và tài khoản ----------
const NhanVienController = {
  kiemTra(b, moi) {
    const e = {};
    if (!str(b.hoTen)) e.hoTen = 'Vui lòng nhập họ tên';
    if (!PHONE.test(str(b.soDienThoai))) e.soDienThoai = 'Số điện thoại sai định dạng';
    if (!QUYEN[b.chucVu]) e.chucVu = 'Vui lòng chọn chức vụ';
    if (moi) {
      if (!/^[a-zA-Z0-9_.]{3,}$/.test(str(b.tenDangNhap))) e.tenDangNhap = 'Tên đăng nhập tối thiểu 3 ký tự (chữ, số, _ .)';
      else if (db().taikhoan.some(t => t.tenDangNhap === str(b.tenDangNhap))) e.tenDangNhap = 'Tên đăng nhập đã tồn tại';
      if (String(b.matKhau || '').length < 6) e.matKhau = 'Mật khẩu tối thiểu 6 ký tự';
    }
    return e;
  },
  danhSach(q) {
    const d = db(), k = str(q.q).toLowerCase();
    return d.nhanvien.filter(n => !k || [n.maNV, n.hoTen, n.soDienThoai, n.chucVu].join(' ').toLowerCase().includes(k)).map(n => { const t = d.taikhoan.find(x => x.maNV === n.maNV) || {}; return { ...n, tenDangNhap: t.tenDangNhap, quyen: t.quyen }; });
  },
  them(b) {
    const e = this.kiemTra(b, true); if (hasErr(e)) throw bad('Dữ liệu không hợp lệ', { errors: e });
    return transaction(d => {
      const nv = { maNV: nextCode('NV'), hoTen: str(b.hoTen), soDienThoai: str(b.soDienThoai), chucVu: b.chucVu, trangThai: true };
      const salt = U.newSalt(); d.nhanvien.push(nv);
      d.taikhoan.push({ maTK: nextCode('TK'), maNV: nv.maNV, maKH: null, tenDangNhap: str(b.tenDangNhap), salt, matKhau: U.hashPw(b.matKhau, salt), quyen: QUYEN[b.chucVu] });
      return nv;
    });
  },
  sua(ma, b) {
    const nv = db().nhanvien.find(n => n.maNV === ma); if (!nv) throw notFound('Không tìm thấy nhân viên');
    const e = this.kiemTra(b, false); if (hasErr(e)) throw bad('Dữ liệu không hợp lệ', { errors: e });
    return transaction(d => { Object.assign(nv, { hoTen: str(b.hoTen), soDienThoai: str(b.soDienThoai), chucVu: b.chucVu }); const t = d.taikhoan.find(x => x.maNV === ma); if (t) t.quyen = QUYEN[b.chucVu]; return nv; });
  },
  doiTrangThai(ma, b, user) {
    const nv = db().nhanvien.find(n => n.maNV === ma); if (!nv) throw notFound('Không tìm thấy nhân viên');
    if (ma === user.maNV) throw bad('Không thể tự khóa tài khoản của chính mình');
    return transaction(() => { nv.trangThai = !!b.trangThai; return nv; });
  },
  datLaiMatKhau(ma, b) {
    const t = db().taikhoan.find(x => x.maNV === ma); if (!t) throw notFound('Không tìm thấy tài khoản');
    if (String(b.matKhau || '').length < 6) throw bad('Mật khẩu tối thiểu 6 ký tự', { errors: { matKhau: 'Mật khẩu tối thiểu 6 ký tự' } });
    return transaction(() => { t.salt = U.newSalt(); t.matKhau = U.hashPw(b.matKhau, t.salt); return { ok: true }; });
  },
};

module.exports = { AuthController, DanhMucController, KhoController, NhaCungCapController, SanPhamController, NhanVienController };
