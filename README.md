# Hệ thống quản lý siêu thị – Nhóm 09 (Node.js)

## Chạy
```
node server.js        # hoặc: npm start
```
Mở http://localhost:3000 (đổi cổng: `PORT=8080 node server.js`). Cần Node.js >= 18, **không cần `npm install`**.
Dữ liệu lưu ở `data/db.json` (tự tạo kèm dữ liệu mẫu; xóa file này để reset). Lỗi hệ thống được ghi vào `data/error.log`.

## Tài khoản mẫu (có nút điền nhanh ở màn hình đăng nhập)
| Tác nhân | Tài khoản | Mật khẩu |
|---|---|---|
| Quản trị viên | admin | admin123 |
| Quản lý | quanly | 123456 |
| Nhân viên bán hàng | banhang | 123456 |
| Nhân viên kho | kho | 123456 |
| Khách hàng | khachhang | 123456 |

## Chức năng (theo biểu đồ use case tổng quát)
Quản lý danh mục sản phẩm · Quản lý nhân viên và tài khoản · Quản lý nhà cung cấp · Quản lý sản phẩm · Thống kê và báo cáo ·
Quản lý nhập hàng và kho · Lập hóa đơn bán hàng · Quản lý khách hàng và khuyến mãi.

4 chức năng của thành viên (làm đúng theo tài liệu, mỗi chức năng một tệp):
| Chức năng | Thành viên | Backend | Giao diện |
|---|---|---|---|
| Thêm mới khách hàng | Nguyễn Quang Huy | `src/khachhang.js` | `public/p_khachhang.js` |
| Thêm hàng vào kho | Thào A Bảy | `src/phieunhap.js` | `public/p_nhapkho.js` |
| Lập hóa đơn bán hàng | Nguyễn Văn Du | `src/hoadon.js` | `public/p_hoadon.js` |
| Quản lý khuyến mãi | Nguyễn Hoàng Sơn | `src/khuyenmai.js` | `public/p_khuyenmai.js` |

Kiến trúc theo sơ đồ trình tự: Giao diện → Controller → DAO → CSDL (`src/db.js`, mỗi lớp thực thể là một bảng trong `db.json`).
Các điểm tài liệu chưa quy định / tự mâu thuẫn xem `GHI_CHU_THEO_TAI_LIEU.md`.

## Lập hóa đơn (bản chỉnh theo thực tế)
Quét/nhập mã → khuyến mãi tự áp dụng → xác nhận (Chờ thanh toán) → chọn hình thức thanh toán, tiền khách đưa/tiền thừa → trừ tồn kho + tích điểm (Đã thanh toán) → xuất hóa đơn. Chi tiết trong `hoadon_sua.pdf`.
