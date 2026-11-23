# Ghi chú: những chỗ tài liệu chưa quy định hoặc tự mâu thuẫn

4 chức năng của thành viên đã làm **đúng theo tài liệu** (kịch bản, luồng ngoại lệ, lớp thực thể, trình tự, sơ đồ trạng thái, hoạt động). File này chỉ liệt kê những chỗ tài liệu **không nói rõ** hoặc **mâu thuẫn**, nên phải chọn một cách hiểu.

## A. Chức năng chung (tài liệu chỉ có tên use case, không có mô tả)
| Chức năng | Đã làm |
|---|---|
| Đăng nhập (`«include»`) | Đăng nhập bằng `TaiKhoan` (MaTK, TenDangNhap, MatKhau mã hóa, Quyen); khóa tài khoản qua trạng thái nhân viên; đổi mật khẩu. |
| Quản lý danh mục sản phẩm | Thêm/sửa/xóa `DanhMuc` (không xóa được khi còn sản phẩm). |
| Quản lý nhân viên và tài khoản | Thêm/sửa nhân viên kèm tài khoản, khóa/mở khóa, đặt lại mật khẩu. |
| Quản lý nhà cung cấp | Thêm/sửa/xóa `NhaCungCap` (không xóa được khi đã có phiếu nhập). |
| Quản lý sản phẩm | Thêm/sửa/xóa, ngừng/kinh doanh lại, xem tồn kho và trạng thái khuyến mãi. |
| Quản lý nhập hàng và kho | `Kho` thêm/sửa/xóa; nhập hàng = chức năng 2. |
| Thống kê và báo cáo | Doanh thu theo ngày, số hóa đơn, giảm giá, chi phí nhập, sản phẩm bán chạy, khách mua nhiều, cảnh báo tồn ≤ 10. Tiêu chí do nhóm tự chọn. |
| Quản lý khách hàng và khuyến mãi | Danh sách/sửa/đổi trạng thái khách hàng và thẻ (chức năng 1) + khuyến mãi (chức năng 4). |
| Phân quyền | Đọc từ các đường nối trong biểu đồ use case tổng quát (hình khó đọc nên có thể lệch vài nét). Khách hàng đăng nhập chỉ xem thông tin, khuyến mãi, hóa đơn của chính mình. |

## B. Mâu thuẫn trong tài liệu và cách chọn
| Mâu thuẫn | Cách chọn |
|---|---|
| "Thủ kho" / "Nhân viên kho"; "Nhân viên quản lý" / "Quản lý" | Hợp nhất thành 5 tác nhân của biểu đồ tổng quát. |
| Mã UC03 vừa là "Lập hóa đơn" vừa là "Xóa khuyến mãi" | Không ảnh hưởng chạy. |
| Biểu đồ lớp tổng quát: `SanPham.SoLuongTon`; mục 3.2.2: lớp `TonKho` riêng | Dùng `TonKho` riêng (mục 3.2.2), có trạng thái Chưa có tồn / Còn hàng / Hết hàng. |
| `KhuyenMai.PhanTramGiam` (3.2.3) và `LoaiGiamGia + GiaTriGiam` (3.2.4) | Dùng bản chi tiết 3.2.4 (phần trăm hoặc số tiền cố định). |
| Biểu đồ lớp hóa đơn ghi `MaNV` cho `KhachHang` | Dùng `maKH`. |
| `KhachHang` 4 trường (3.1) và đầy đủ (3.2.1) | Dùng đầy đủ 3.2.1. |
| Sơ đồ trạng thái hóa đơn có Chờ thanh toán → Đã thanh toán nhưng kịch bản cũ không có bước thanh toán | Đã bổ sung bước thanh toán vào tài liệu (`hoadon_sua.pdf`) và code. |

## C. Chỗ tài liệu không quy định (tự bổ sung tối thiểu)
| Chức năng | Điểm bổ sung |
|---|---|
| 1. Khách hàng | SĐT bắt đầu bằng 0, 10–11 chữ số; email theo mẫu thông thường; ngày sinh không ở tương lai. Thẻ thành viên cấp mới có hạng "Thường"; không có ngày hết hạn nên việc chuyển sang "Hết hạn/Gia hạn" do nhân viên bấm theo sự kiện trong sơ đồ trạng thái. |
| 2. Thêm hàng vào kho | Phiếu nhập được tạo ở trạng thái Nháp ngay khi "Bắt đầu lập phiếu" (nên có thể còn phiếu Nháp để "Tiếp tục lập" hoặc "Hủy phiếu"). Số lượng nhập phải là số nguyên. |
| 3. Hóa đơn (đã chỉnh theo quy trình bán lẻ thực tế, xem `hoadon_sua.pdf`) | **Thanh toán:** chọn Tiền mặt / Thẻ / Chuyển khoản–QR / Ví điện tử; tiền mặt nhập tiền khách đưa (phải ≥ tổng) và hệ thống tính tiền thừa. **Tồn kho** chỉ bị trừ khi thanh toán thành công (xác nhận chỉ chốt hóa đơn và kiểm tra còn đủ hàng); hủy khi chưa thanh toán không đụng tồn kho; hóa đơn đã thanh toán không hủy được. **Khuyến mãi** tự áp dụng, mỗi sản phẩm chỉ hưởng 1 chương trình có lợi nhất (không cộng dồn), nhân viên chỉ bỏ/giữ từng chương trình; "số tiền cố định" là giảm trên mỗi đơn vị sản phẩm, không vượt thành tiền dòng. **Tích điểm:** 1 điểm / 10.000 ₫ khi thanh toán (hằng số `DIEM_MOI` trong `src/hoadon.js`). Khách đổi ý: Chờ thanh toán → Đang lập. Thống kê doanh thu tính theo ngày thanh toán. Hóa đơn in có hình thức thanh toán, tiền thừa, điểm cộng, ghi chú giá đã gồm VAT (không tách thuế). Xuất hóa đơn = trang in / lưu PDF của trình duyệt. Chưa có bán theo cân (kg) và trả hàng. |
| 4. Khuyến mãi | Trạng thái tự chuyển theo ngày (Chưa bắt đầu → Đang diễn ra → Đã kết thúc) khi mở màn hình khuyến mãi / bán hàng. "Đang tạo" và "Đã hủy" xảy ra trên form (bấm Hủy thì không lưu). Khi ngừng chương trình, chi tiết chuyển "Đã kết thúc". "Điều kiện áp dụng của sản phẩm" hiểu là sản phẩm tồn tại và đang kinh doanh. Tiêu chí tìm kiếm: từ khóa (mã/tên/mô tả) + trạng thái. Chỉ Quản lý được ghi; Nhân viên bán hàng và Khách hàng chỉ xem. |

## D. Công nghệ
Tài liệu không nêu công nghệ: dùng Node.js thuần, dữ liệu lưu file JSON (mỗi lớp thực thể một bảng) có giao dịch hoàn tác khi lỗi.
