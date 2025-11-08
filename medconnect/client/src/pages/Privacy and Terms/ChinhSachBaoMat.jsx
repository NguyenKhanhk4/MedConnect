import { Link } from "react-router-dom";
import { HomeOutlined } from "@ant-design/icons";
import NavigationBreadcrumb from "../../components/Breadcrumb/NavigationBreadcrumb";
import "./ChinhSachBaoMat.scss";

export default function ChinhSachBaoMat() {
  return (
    <div className="privacy-container">
      {/* Breadcrumb */}
      <div className="container">
        <NavigationBreadcrumb
          items={[
            {
              label: "Trang chủ",
              path: "/",
              icon: <HomeOutlined />,
            },
            {
              label: "Chính sách bảo mật",
            },
          ]}
        />
      </div>

      <div className="privacy-header">
        <div className="container">
          <h1>CHÍNH SÁCH BẢO VỆ DỮ LIỆU CÁ NHÂN</h1>
          <p className="subtitle">CỦA DỰ ÁN CÁ NHÂN "MEDCONNECT"</p>
          <p className="effective-date">
            Hiệu lực: 01/01/2025 – Cập nhật lần cuối: 01/01/2025
          </p>
        </div>
      </div>

      <div className="privacy-content">
        <div className="container">
          <div className="privacy-text">
            <p className="intro">
              Chính sách này giải thích cách MedConnect ("Dự án", "chúng tôi")
              thu thập, sử dụng, chia sẻ, lưu trữ và bảo vệ Dữ Liệu Cá Nhân khi
              bạn tạo tài khoản, đặt lịch và/hoặc sử dụng tư vấn y tế trực tuyến
              trên nền tảng.
            </p>

            <div className="notice-box">
              <p>
                <strong>Lưu ý pháp lý:</strong> MedConnect là dự án cá nhân,
                không phải cơ sở khám chữa bệnh; hoạt động như nền tảng công
                nghệ kết nối bác sĩ và người dùng. Nội dung tư vấn chuyên môn
                thuộc trách nhiệm của bác sĩ.
              </p>
            </div>

            <h2>I. QUY ĐỊNH CHUNG</h2>

            <p>
              <strong>1.1. Dữ Liệu Cá Nhân:</strong> mọi thông tin gắn với hoặc
              nhận diện một cá nhân; gồm dữ liệu cơ bản và dữ liệu nhạy cảm
              (theo Nghị định 13/2023/NĐ-CP).
            </p>

            <p>
              <strong>1.2. Chủ Thể Dữ Liệu:</strong> người dùng, bác sĩ, người
              liên hệ khẩn cấp, ứng viên cộng tác… mà dữ liệu phản ánh.
            </p>

            <p>
              <strong>1.3. Xử Lý Dữ Liệu:</strong> các hoạt động như thu thập,
              ghi, phân tích, lưu trữ, chia sẻ, ẩn danh, xóa, mã hóa/giải mã…
            </p>

            <p>
              <strong>1.4. Dữ liệu người liên quan:</strong> nếu bạn cung cấp dữ
              liệu của con, người giám hộ hoặc người liên hệ, bạn xác nhận đã có
              đồng ý hợp pháp của họ cho các mục đích nêu dưới đây.
            </p>

            <p>
              <strong>1.5. Cơ sở pháp lý:</strong> chúng tôi xử lý dữ liệu dựa
              trên: (i) thực hiện dịch vụ/"hợp đồng" bạn yêu cầu; (ii) đồng ý
              của bạn (đặc biệt với dữ liệu sức khỏe/tiếp thị); (iii) lợi ích
              hợp pháp về an toàn, chống gian lận; (iv) nghĩa vụ pháp luật.
            </p>

            <p>
              <strong>1.6. Cập nhật:</strong> chính sách có thể được điều chỉnh
              và công bố trên trang /privacy. Tiếp tục sử dụng nghĩa là bạn đồng
              ý bản mới.
            </p>

            <div className="contact-info">
              <p>
                <strong>1.7. Thông tin kiểm soát dữ liệu</strong>
              </p>
              <p>
                Người kiểm soát dữ liệu: Nhóm Phát Triển – Chủ dự án MedConnect
              </p>
              <p>Email liên hệ: support@medconnect.vn | SĐT: 1900-xxxx</p>
              <p>Địa chỉ liên hệ: Việt Nam</p>
            </div>

            <h2>II. DỮ LIỆU CÁ NHÂN ĐƯỢC XỬ LÝ</h2>

            <p>
              <strong>2.1. Dữ liệu cơ bản (tuỳ trường hợp):</strong>
            </p>
            <p>
              Họ tên, ảnh đại diện, ngày sinh/giới tính (nếu cung cấp), email,
              số điện thoại, địa chỉ liên hệ; thông tin nghề nghiệp/chuyên khoa
              (đối với bác sĩ); lịch sử đặt lịch; nội dung đánh giá/ghi chú bạn
              gửi; dữ liệu kỹ thuật (thiết bị, trình duyệt, địa chỉ IP,
              cookie/ID thiết bị, log truy cập); hình ảnh tại cơ sở khám đối tác
              (nếu khám trực tiếp và cơ sở có camera).
            </p>

            <p>
              <strong>
                2.2. Dữ liệu nhạy cảm (chỉ xử lý khi có cơ sở phù hợp và/hoặc
                đồng ý rõ ràng):
              </strong>
            </p>
            <ul>
              <li>
                Thông tin sức khỏe do bạn/bác sĩ cung cấp trong buổi khám: triệu
                chứng, bệnh sử liên quan, tóm tắt tư vấn, đơn thuốc điện tử, tài
                liệu y khoa bạn tải lên.
              </li>
              <li>
                Dữ liệu vị trí gần đúng khi bạn bật tính năng tìm bác sĩ theo
                khu vực.
              </li>
              <li>
                Thông tin giao dịch thanh toán: mã giao dịch, trạng thái, thời
                điểm (không lưu số thẻ/CVV).
              </li>
              <li>
                Dữ liệu khác mà pháp luật xếp là nhạy cảm theo từng thời kỳ.
              </li>
            </ul>

            <h2>III. MỤC ĐÍCH XỬ LÝ</h2>

            <p>
              <strong>3.1. Cung cấp dịch vụ:</strong> tạo/quản lý tài khoản; xác
              minh bác sĩ; đặt/đổi/hủy lịch; thực hiện tư vấn video; phát hành
              tóm tắt/đơn thuốc; gửi nhắc lịch và thông báo.
            </p>

            <p>
              <strong>3.2. Thanh toán & chống gian lận:</strong> xử lý qua
              VNPAY/MoMo/VIETQR (hoặc đối tác tương đương), đối soát, phát hiện
              bất thường.
            </p>

            <p>
              <strong>3.3. Cải tiến chất lượng:</strong> thống kê/phan tích đã
              ẩn danh hoặc giả danh để nâng cấp trải nghiệm, độ ổn định hệ
              thống.
            </p>

            <p>
              <strong>3.4. Tiếp thị (tùy chọn):</strong> gửi ưu đãi/khuyến mại
              phù hợp khi bạn đồng ý; bạn có thể rút lại bất cứ lúc nào.
            </p>

            <p>
              <strong>3.5. Tuân thủ pháp luật:</strong> đáp ứng yêu cầu hợp lệ
              của cơ quan nhà nước; thực hiện nghĩa vụ lưu trữ, kế toán/thuế
              (nếu phát sinh).
            </p>

            <p>
              <strong>3.6. Trường hợp khác:</strong> chỉ khi có đồng ý bổ sung
              từ bạn.
            </p>

            <h2>IV. CÁCH THỨC THU THẬP – LƯU TRỮ – CHIA SẺ</h2>

            <p>
              <strong>4.1. Thu thập:</strong>
            </p>
            <p>
              Biểu mẫu trên web/app; tổng đài/chat/email; quá trình dùng tính
              năng (đặt lịch, video); cookie/SDK thông báo; tài liệu bạn tải
              lên; nguồn công khai/chính thống; dữ liệu chia sẻ từ đối tác tích
              hợp khi cần cho dịch vụ (cổng thanh toán, dịch vụ video
              ZEGOCLOUD/Agora, bản đồ Google Maps, thông báo Firebase Cloud
              Messaging).
            </p>

            <p>
              <strong>4.2. Lưu trữ:</strong>
            </p>
            <ul>
              <li>
                Máy chủ/đám mây đặt tại VN hoặc khu vực khác (khi cần) của nhà
                cung cấp hạ tầng đáp ứng an toàn thông tin.
              </li>
              <li>
                Thành phần nhạy cảm được mã hóa khi truyền (TLS) và khi lưu
                (at-rest); phân quyền theo vai trò; ghi nhận truy cập; sao lưu
                định kỳ.
              </li>
            </ul>

            <p>
              <strong>4.3. Chia sẻ/Chuyển giao (không bán dữ liệu):</strong>
            </p>
            <ul>
              <li>
                Bác sĩ khám của bạn (chỉ phạm vi cần thiết cho buổi khám).
              </li>
              <li>
                Đối tác kỹ thuật: thanh toán, video call, bản đồ, gửi thông báo,
                lưu trữ/bảo mật; các đơn vị hỗ trợ pháp lý/kiểm toán khi cần.
              </li>
              <li>Cơ quan nhà nước khi có yêu cầu hợp lệ.</li>
              <li>
                Chuyển dữ liệu ra nước ngoài (nếu có): tuân thủ Nghị định 13
                (đánh giá tác động, bảo đảm ràng buộc bảo vệ dữ liệu với bên
                nhận).
              </li>
            </ul>

            <p>
              <strong>4.4. Xóa dữ liệu:</strong>
            </p>
            <p>
              Xóa/ẩn danh khi hết mục đích hoặc theo yêu cầu hợp lệ, trừ trường
              hợp pháp luật yêu cầu lưu giữ hoặc vì lý do an ninh, tố tụng,
              nghiên cứu theo quy định.
            </p>

            <h2>V. DỮ LIỆU CỦA TRẺ EM</h2>

            <p>Ưu tiên lợi ích tốt nhất của trẻ em.</p>

            <p>
              Chỉ xử lý khi có đồng ý của cha/mẹ hoặc người giám hộ; với trẻ từ
              7 tuổi, cần thêm sự đồng ý của trẻ theo luật.
            </p>

            <p>
              Bằng chứng đồng ý do người giám hộ cung cấp và chịu trách nhiệm.
            </p>

            <h2>VI. RỦI RO CÓ THỂ PHÁT SINH</h2>

            <p>
              Dù áp dụng tường lửa, mã hóa, kiểm soát truy cập…, không hệ thống
              nào an toàn tuyệt đối; có thể tồn tại rủi ro do lỗ hổng zero-day,
              sự cố hạ tầng, tấn công mạng. Bạn cần: (i) giữ bí mật mật
              khẩu/OTP; (ii) đăng xuất khi không dùng; (iii) không công khai dữ
              liệu y tế của mình trên môi trường công cộng.
            </p>

            <p>
              Nếu có sự cố rò rỉ, chúng tôi sẽ: (a) ghi nhận – khắc phục; (b)
              thông báo cho cơ quan chức năng và chủ thể dữ liệu theo luật; (c)
              áp dụng biện pháp giảm thiểu thiệt hại.
            </p>

            <h2>VII. THỜI HẠN XỬ LÝ & LƯU GIỮ</h2>

            <p>
              <strong>Bắt đầu:</strong> từ thời điểm chúng tôi nhận dữ liệu hợp
              pháp và có cơ sở pháp lý phù hợp.
            </p>

            <p>
              <strong>Kết thúc:</strong> khi đạt mục đích xử lý; sau đó sẽ
              xóa/ẩn danh trừ trường hợp phải lưu theo luật.
            </p>

            <p>
              <strong>Tham chiếu thực hành:</strong> tài khoản/nghiệp vụ thường
              lưu trong thời gian bạn sử dụng và tối đa 03 năm sau khi đóng tài
              khoản; hồ sơ tư vấn/đơn thuốc lưu theo thời hạn pháp luật y tế
              (nếu áp dụng qua đối tác y tế).
            </p>

            <h2>VIII. CÁ NHÂN/TỔ CHỨC THAM GIA XỬ LÝ</h2>

            <ul>
              <li>
                Chúng tôi (chủ dự án) – vai trò Kiểm soát dữ liệu hoặc Kiểm soát
                & Xử lý.
              </li>
              <li>Bác sĩ/đối tác y tế – bên nhận dữ liệu phục vụ khám.</li>
              <li>
                Đối tác hạ tầng (video, thanh toán, bản đồ, đám mây, bảo mật).
              </li>
              <li>Cơ quan nhà nước (theo yêu cầu hợp lệ).</li>
            </ul>
            <p>Mọi bên nhận có nghĩa vụ bảo mật theo hợp đồng ràng buộc.</p>

            <h2>IX. QUYỀN CỦA BẠN (CHỦ THỂ DỮ LIỆU)</h2>

            <p>
              Bạn có quyền theo Nghị định 13: được biết, đồng ý/không đồng ý,
              truy cập, sửa, xóa, hạn chế xử lý, yêu cầu cung cấp dữ liệu, phản
              đối, rút đồng ý, khiếu nại/khởi kiện, yêu cầu bồi thường.
            </p>
            <p>
              Gửi yêu cầu tới support@medconnect.vn (tiêu đề: "Yêu cầu dữ liệu
              cá nhân – MedConnect"), kèm thông tin xác minh. Chúng tôi phản hồi
              trong thời hạn luật định. Có thể từ chối nếu yêu cầu không hợp
              lệ/không đủ xác minh/bị cấm bởi pháp luật/ảnh hưởng quyền lợi hợp
              pháp của bên khác.
            </p>

            <h2>X. NGHĨA VỤ CỦA BẠN</h2>

            <p>
              Cung cấp thông tin đúng – đủ; tự bảo vệ dữ liệu và tôn trọng dữ
              liệu người khác; thông báo ngay khi nghi ngờ rò rỉ; tuân thủ quy
              định bảo vệ dữ liệu cá nhân khi sử dụng nền tảng.
            </p>

            <h2>XI. THÔNG TIN LIÊN HỆ & KHIẾU NẠI</h2>

            <div className="contact-info">
              <p>
                <strong>Chủ dự án/Người kiểm soát dữ liệu:</strong> Nhóm Phát
                Triển
              </p>
              <p>
                <strong>Email hỗ trợ & bảo mật:</strong> support@medconnect.vn
              </p>
              <p>
                <strong>Trang tiếp nhận yêu cầu:</strong> /data-requests (nếu
                có)
              </p>
            </div>

            <div className="back-button">
              <Link to="/dang-ky" className="btn btn-primary">
                Quay lại đăng ký
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
