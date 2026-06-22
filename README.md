# Checklist Job Board - Công Cụ Checklist Công Việc & Xử Lý Sự Cố Nhóm

Đây là một công cụ web-based giúp các nhóm làm việc cộng tác thông qua các checklist quy trình công việc. Khi thực hiện từng bước, bạn có thể đánh dấu hoàn thành để không bị quên, đồng thời đồng nghiệp cũng sẽ thấy tiến độ thực tế theo thời gian thực. Khi xảy ra lỗi, bạn có thể đánh dấu bước bị lỗi, nhập thông tin sự cố để đồng nghiệp vào rà soát và ghi chú sửa lỗi.

## Các tính năng chính

1. **Checklist Cộng Tác Thời Gian Thực**: Đồng bộ hóa tức thì giữa tất cả các thành viên qua Server-Sent Events (SSE). Bất kỳ thay đổi nào (đánh dấu bước, thêm bình luận, báo lỗi) sẽ ngay lập tức cập nhật trên màn hình của mọi người mà không cần tải lại trang.
2. **Quy Trình Chuẩn (Templates)**: Tạo các mẫu checklist tái sử dụng cho nhiều công việc lặp đi lặp lại (ví dụ: Quy trình Deploy Production, Quy trình dựng video lồng tiếng, Quy trình bàn giao khách hàng).
3. **Nhật Ký Xử Lý Sự Cố (Troubleshooting Board)**: 
   - Đánh dấu một bước bị lỗi để chuyển trạng thái công việc sang cảnh báo màu đỏ (Failed).
   - Thêm bình luận rà soát lỗi trực tiếp dưới từng bước để ghi lại nguyên nhân và cách khắc phục.
   - Luồng hoạt động hiển thị chi tiết dòng thời gian ai đã làm gì, lúc nào.
4. **Giao Diện Premium**: Thiết kế tối giản, hỗ trợ Dark Mode cực đẹp và linh hoạt cho màn hình máy tính hay điện thoại.

---

## Hướng dẫn cài đặt và chạy ứng dụng

Ứng dụng chạy trên Node.js cực kỳ nhẹ và lưu trữ dữ liệu trực tiếp dưới dạng file JSON (`data/db.json`), không cần cài đặt cơ sở dữ liệu phức tạp.

### Bước 1: Khởi chạy ứng dụng
1. Đảm bảo bạn đang ở thư mục chứa mã nguồn: `e:\Code\Tool\Checklist job`
2. Khởi chạy server:
   ```bash
   npm start
   ```
   *Hoặc chạy ở chế độ phát triển để tự động reload khi sửa code:*
   ```bash
   npm run dev
   ```

### Bước 2: Truy cập ứng dụng
- **Trên máy của bạn**: Mở trình duyệt và truy cập: [http://localhost:3000](http://localhost:3000)
- **Chia sẻ với đồng nghiệp**: 
  1. Kiểm tra IP mạng nội bộ của bạn (ví dụ chạy lệnh `ipconfig` trên Windows và tìm dòng `IPv4 Address`, ví dụ: `192.168.1.15`).
  2. Gửi đường dẫn cho đồng nghiệp của bạn truy cập: `http://192.168.1.15:3000`

---

## Hướng dẫn sử dụng chi tiết

1. **Nhập Tên Đồng Nghiệp**: Tại góc trên bên phải màn hình, hãy nhập tên của bạn vào ô "Đồng nghiệp" để hệ thống biết ai đang thực hiện các bước.
2. **Tạo Công Việc Từ Mẫu**:
   - Nhấp vào nút **+ Việc Mới** ở cột bên trái.
   - Chọn một mẫu quy trình có sẵn (ví dụ: Quy trình Triển khai Production hoặc Quy trình Lồng tiếng & Làm Video).
   - Điền tên công việc mới (hoặc để trống để lấy tên mặc định của mẫu) và mô tả nếu cần, sau đó bấm **Khởi Chạy**.
3. **Thực Hiện Checklist**:
   - Nhấp vào tiêu đề bước để xem mô tả chi tiết của bước đó.
   - Bạn có thể nhanh chóng tích vào ô checkbox để đánh dấu hoàn thành bước đó (hoặc bấm nút **Hoàn Thành Bước** bên trong phần chi tiết).
   - Cột Tiến độ ở trên cùng sẽ cập nhật % tiến độ của công việc.
4. **Báo Lỗi và Rà Soát (Troubleshooting)**:
   - Nếu gặp vấn đề khi thực hiện một bước, bấm vào bước đó để xem chi tiết và nhấp vào nút **Báo Cáo Bị Lỗi**.
   - Nhập thông tin chi tiết về lỗi bạn gặp phải. Bước này sẽ chuyển sang màu đỏ cảnh báo và công việc chung cũng sẽ chuyển trạng thái cảnh báo **Gặp Sự Cố** trên tất cả màn hình của đồng nghiệp.
   - Đồng nghiệp có thể nhấp vào bước này và gửi các ghi chú bình luận rà soát lỗi trực tiếp dưới khung chat của bước để cùng nhau thảo luận phương pháp khắc phục.
   - Sau khi sửa lỗi xong, bạn hoặc đồng nghiệp có thể bấm **Hoàn Thành Bước** hoặc **Chuyển Về Chờ** để tiếp tục công việc.
5. **Quản Lý Mẫu Quy Trình (Templates)**:
   - Chuyển sang tab **Mẫu Checklist** ở cột bên trái.
   - Bạn có thể nhấp vào **Tạo Mẫu Checklist Mới** để tự thiết kế một quy trình làm việc chuẩn cho phòng ban của mình.
   - Nhập tên mẫu, mô tả và thêm các bước thực hiện tùy thích. Mẫu này sẽ ngay lập tức xuất hiện trong danh sách mẫu có thể khởi chạy.
