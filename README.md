# Deadlock Recovery Lab

Ứng dụng web cho đồ án **Hệ thống tự động khôi phục từ deadlock bằng cách kết thúc tiến trình hoặc chiếm lại tài nguyên**.

## Chức năng chính

- Nhập và chọn kịch bản tiến trình: burst time, độ ưu tiên, chi phí hủy, tài nguyên đang giữ và tài nguyên đang chờ.
- Hỗ trợ nhập thủ công theo dạng `PID, burst, priority, cost, holds, waits`, ví dụ `P1, 7, 2, 8, R1, R2`. Nếu một ô có nhiều tài nguyên, phân tách bằng `|`, ví dụ `R1|R2`.
- Vẽ Resource Allocation Graph:
  - `P -> R`: tiến trình đang yêu cầu tài nguyên.
  - `R -> P`: tài nguyên đang được cấp phát cho tiến trình.
- Chuyển Resource Allocation Graph sang Wait-For Graph để phát hiện chu trình deadlock.
- Tự động chọn tiến trình nạn nhân theo chi phí hủy thấp, độ ưu tiên thấp và burst nhỏ.
- Khôi phục deadlock bằng 2 chiến lược:
  - `Kill process`: kết thúc tiến trình nạn nhân và giải phóng tài nguyên.
  - `Preempt resource`: chiếm lại tài nguyên từ tiến trình nạn nhân và cấp cho tiến trình đang chờ.
- Hiển thị Gantt khôi phục, bảng trạng thái và nhật ký từng bước thuật toán.

## Chức năng bổ sung theo yêu cầu đề

- Lập lịch CPU: FCFS, SJF, Priority, Round Robin; vẽ Gantt; tính thời gian chờ, hoàn tất và đáp ứng trung bình.
- Semaphore: minh họa cơ chế `wait()` / `signal()` ngăn xung đột tài nguyên.
- Dịch địa chỉ logic sang địa chỉ vật lý bằng bảng trang.
- Page Replacement: FIFO, LRU và tổng số page fault.
- Task Manager giả lập: PID, CPU, RAM, trạng thái và thao tác kill process.

## Cách chạy nhanh

Nhấp đúp:

- `CHAY-DEMO.bat`
- hoặc `run-demo.bat`

Ứng dụng mở `demo.html` và tự chuyển sang `index.html`.

## Chạy bằng server local

```powershell
cd C:\workplace\groupthap
node server.js
```

Sau đó mở:

```text
http://127.0.0.1:5500
```

## Kịch bản demo đề xuất

1. Mở tab `Deadlock Recovery`.
2. Chọn kịch bản `Deadlock 3 tiến trình`.
3. Bấm `Phát hiện` để tô sáng chu trình deadlock trên đồ thị.
4. Chọn `Kill process` hoặc `Preempt resource`.
5. Bấm `Khôi phục`, hoặc bấm `Tự động xử lý đến khi an toàn`.
6. Quan sát Gantt khôi phục, bảng trạng thái và nhật ký thuật toán.
