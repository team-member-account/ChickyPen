# ChickyPen

Ứng dụng iPhone quản lý trại gà hộ gia đình. Giao diện tiếng Việt, xanh lá–kem, hoạt động offline. Dữ liệu ban đầu trống.

## Cài đặt

Dùng Node.js 24 LTS và npm. Trong thư mục dự án:

```powershell
npm ci
npx tsc --noEmit
```

Khi bạn muốn tự mở ứng dụng:

```powershell
npm start
```

Expo SDK 57, React Native 0.86.3, React 19.2.3, Expo Router, React Native Paper và react-native-gifted-charts. Các thư viện native theo `expo/bundledNativeModules.json`. Giữ `package-lock.json` để cài lại đúng phiên bản. Expo Go trên iPhone cần hỗ trợ SDK 57; bản development hoặc preview dùng để tự xác nhận hành vi native đầy đủ.

## Build iOS bằng EAS

Chưa liên kết tài khoản Expo, Apple Developer hoặc EAS project. Bundle Identifier mặc định: `com.chickypen.app`. Không có tài khoản, chứng chỉ hay khóa bí mật trong mã nguồn.

1. Tạo tài khoản tại [Expo](https://expo.dev/), rồi đăng nhập và tạo project:

   ```powershell
   npx eas-cli@latest login
   npx eas-cli@latest init
   ```

   Chọn tạo project ChickyPen. Lệnh `init` bổ sung `extra.eas.projectId` vào `app.json`. Không tự điền UUID giả. Chọn tài khoản/organization của bạn nếu được yêu cầu.

2. Cài bản nội bộ lên iPhone thật: cần tài khoản Apple Developer có quyền phân phối và đăng ký thiết bị với EAS.

   ```powershell
   npx eas-cli@latest device:create
   npx eas-cli@latest build --platform ios --profile preview
   ```

   Làm theo hướng dẫn của EAS để liên kết Apple Developer và tạo chứng chỉ. Bản preview chạy độc lập, không cần máy tính mở Metro. Nếu Bundle ID đã thuộc tài khoản khác, đổi `ios.bundleIdentifier` thành định danh của bạn trước build đầu tiên.

3. Bản TestFlight/App Store:

   ```powershell
   npx eas-cli@latest build --platform ios --profile production
   npx eas-cli@latest submit --platform ios --latest
   ```

   Tạo ứng dụng tương ứng trong App Store Connect và hoàn tất thông tin phân phối của Apple. Lệnh submit chỉ gửi khi bạn chủ động chạy.

   Nếu đã cài EAS CLI, có thể dùng lệnh trong brief:

   ```powershell
   eas build --platform ios
   ```

Profile `development` dùng expo-dev-client với Metro. `preview` phân phối nội bộ; `production` tự tăng build number. Có thể build qua EAS từ Windows, không cần Xcode trên máy này. Quyền thông báo chỉ xin trên iPhone khi bạn dùng tính năng.

## Bảy màn hình

| Mục       | Chức năng                                                                                                        |
| --------- | ---------------------------------------------------------------------------------------------------------------- |
| Tổng quan | Tổng đàn và từng lô, trứng hôm nay/7 ngày, thu chi tháng, cảnh báo vaccine trong 3 ngày và quá hạn, tồn kho thấp |
| Đàn gà    | CRUD lô; nhập thêm/xuất bán/gà chết; sửa/xóa lịch sử; đóng, mở lại, lưu trữ                                      |
| Trứng     | Ghi theo ngày và lô đẻ; tỷ lệ đẻ; tuần, tháng, trung bình ngày; xu hướng 30 ngày                                 |
| Thức ăn   | Danh mục kg/túi/bao; nhập và tiêu thụ; tồn kho; ngưỡng cảnh báo; sửa/xóa phát sinh                               |
| Sức khỏe  | Vaccine, mũi nhắc lại, hoàn thành riêng từng mũi, nhắc cục bộ, nhật ký và tỷ lệ chết                             |
| Thu chi   | Khoản thủ công và tự động; báo cáo tháng; biểu đồ cơ cấu theo danh mục                                           |
| Báo cáo   | Đàn đầu/cuối kỳ, trứng, chết, thu chi, tồn kho; xuất `.txt` hoặc chia sẻ văn bản                                 |

Vuốt ngang thanh điều hướng để xem đủ 7 mục, giữ nhãn dễ đọc trên iPhone nhỏ. Kéo xuống để tải lại số liệu. Ngày nhập theo `DD/MM/YYYY`; tiền nguyên đồng; số thập phân dùng dấu phẩy hoặc chấm, không nhập dấu phân cách hàng nghìn.

## Quy tắc dữ liệu

- Dữ liệu ở SQLite `chickypen.db`, trong vùng dữ liệu ứng dụng. WAL, khóa ngoại, phiên bản schema được cấu hình khi mở. Không backend, đăng nhập hay cloud sync.
- Các thay đổi liên quan cùng commit hoặc rollback. Hàng đợi ghi ngăn thao tác chồng nhau. Snapshot mọi màn hình được tải lại sau khi lưu, khi về foreground và khi đổi ngày Việt Nam.
- Số gà là số nguyên không âm. Kiểm tra số dư cuối từng ngày trên toàn bộ lịch sử, kể cả sau sửa/xóa; nhập và xuất cùng ngày được gộp vì không lưu giờ. Thiết kế cho quy mô trại nhỏ; không khóa cứng ở 500 con.
- Lần nhập đàn ban đầu luôn có trong lịch sử. Sửa qua thông tin lô; từ chối nếu gây mâu thuẫn với dữ liệu liên quan. Lô đã có trứng không đổi được loại gà.
- Chỉ xóa hẳn lô chưa có phát sinh ngoài lần nhập ban đầu. Lô có lịch sử được đóng/lưu trữ khi còn 0 con; vẫn giữ trong báo cáo quá khứ. Mở lại lô để sửa hoặc thêm phát sinh.
- Gà chết ở Sức khỏe và lịch sử đàn dùng cùng bản ghi, không trừ hai lần. Xóa bản ghi chết hoàn lại số lượng nếu lịch sử vẫn hợp lệ.
- Mỗi ngày/lô đẻ có một bản ghi trứng, cho phép 0. Tỷ lệ đẻ = trứng / gà còn cuối ngày × 100, lấy số gà từ lịch sử. Không giới hạn tỷ lệ ở 100% để giữ số liệu thực nhập. Tuần bắt đầu thứ Hai. Trung bình chia số ngày từ đầu tháng đến hôm nay, gồm ngày chưa ghi là 0.
- Phát sinh thực tế không ở ngày tương lai hoặc trước ngày nhập lô. Vaccine được phép ở tương lai. Ngày từ năm 2000 trở đi. Ngày hiện tại và lời nhắc theo giờ Việt Nam.
- Thức ăn nhận lượng thập phân. Tồn = nhập − tiêu thụ, kiểm tra số dư cuối ngày và toàn bộ lịch sử khi sửa/xóa. Không đổi đơn vị hoặc xóa danh mục đã có phát sinh. Ngưỡng 0 vẫn cảnh báo khi hết hàng.
- Nhập kho tự tạo chi Thức ăn = lượng × đơn giá, làm tròn đồng. Đơn giá 0 cho thức ăn tự làm/được cho. Xuất bán có doanh thu lớn hơn 0 tự tạo thu: lô giống dùng Bán gà giống, lô khác dùng Bán gà thịt. Sửa/xóa nguồn đồng bộ khoản tiền cùng transaction; không sửa trực tiếp khoản tự động ở Thu chi.
- Tiền mua giống, bán trứng và khoản ngoài giao dịch kho/xuất đàn nhập riêng ở Thu chi. Không tự ghi thu từ sản lượng trứng vì chưa có giá và số đã bán.
- Lãi/lỗ = thu − chi đã ghi trong tháng, chưa phân bổ giá trị tồn kho/đàn. Tỷ lệ chết = số chết / (đàn đầu tháng + số nhập trong tháng) × 100. Mẫu số 0 cho tỷ lệ 0. Báo cáo giữ số quá khứ của cả lô hiện đã lưu trữ.

## Nhắc vaccine

Dùng thông báo cục bộ `expo-notifications`, không cần server, mạng, APNs token hoặc Expo push token. Thêm lịch sẽ xin quyền; trong Sức khỏe có nút bật/đồng bộ và mở Cài đặt iPhone.

- Nhắc lúc 08:00, trước mỗi mũi một ngày, UTC+07:00.
- Mũi đầu và nhắc lại có lời nhắc, trạng thái và ngày hoàn thành riêng. Đánh dấu hoàn thành ghi hôm nay, có thể bỏ dấu nếu ghi nhầm. Mũi nhắc lại chỉ hoàn thành sau mũi đầu.
- Hủy lời nhắc khi hoàn thành, xóa lịch hoặc đóng/lưu trữ lô. Mở lại hoặc bỏ dấu hoàn thành sẽ đồng bộ lời nhắc còn ở tương lai.
- Nếu giờ nhắc đã qua khi tạo lịch, không đặt lùi giờ. Lịch vẫn hiện ở Sức khỏe và cảnh báo đến hạn/quá hạn.
- Do giới hạn iOS, chỉ đặt 60 lời nhắc gần nhất. Nếu nhiều hơn, hiển thị cảnh báo và bổ sung khi mở app lần sau. Lời nhắc ngoài 60 mục không tự được bổ sung nếu không mở app lại.
- Lỗi quyền/thông báo không làm mất lịch đã lưu; màn hình hướng dẫn đồng bộ lại. Focus hoặc cài đặt của iOS có thể trì hoãn hiển thị.

Thông báo đã lập lịch được iOS quản lý khi app không mở. Bạn cần tự xác nhận trên iPhone; kiểm tra TypeScript không xác nhận hành vi native.

## Chia sẻ và lưu dữ liệu

Xuất báo cáo tạo `.txt` UTF-8 trong cache, chia sẻ qua `expo-sharing`. Chia sẻ nội dung dùng bảng chia sẻ văn bản iOS, phù hợp Zalo/Messenger nếu được cài và hỗ trợ. Không tự gửi cho bất kỳ người nào.

SQLite giữ dữ liệu khi tắt/mở app. Gỡ app có thể xóa dữ liệu; tệp báo cáo không phải bản sao lưu có thể khôi phục. Chưa có nhập/khôi phục hoặc đồng bộ đám mây trong phạm vi này.

## Mã nguồn

```text
app/          Bảy tab Expo Router và chi tiết lô
components/   Giao diện dùng chung, biểu mẫu, biểu đồ
constants/    Màu sắc và danh mục
db/           Schema, migration, toàn bộ SQL
hooks/        Hook theo nghiệp vụ
providers/    Hàng đợi ghi, snapshot, cập nhật màn hình
types/        Kiểu TypeScript
utils/        Định dạng, thống kê, nhắc lịch, báo cáo, log
assets/       Biểu tượng ứng dụng
app.json      Cấu hình Expo và iOS
eas.json      Profile build iOS
```

Insert/update/delete, commit/rollback, xuất/chia sẻ, lập/hủy thông báo đều có `console.log` với tiền tố `[ChickyPen]`. Không dữ liệu mẫu, unit test hoặc workflow tự động mở/build/test ứng dụng.

Tài liệu: [SDK 57](https://expo.dev/changelog/sdk-57), [SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/), [Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/), [Sharing](https://docs.expo.dev/versions/latest/sdk/sharing/), [EAS Build](https://docs.expo.dev/build/setup/).

Repository: [team-member-account/ChickyPen](https://github.com/team-member-account/ChickyPen). Không commit database, dữ liệu trại, node_modules hoặc thông tin xác thực.
