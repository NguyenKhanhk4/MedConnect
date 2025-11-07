import { Link } from "react-router-dom";
import { HomeOutlined } from "@ant-design/icons";
import NavigationBreadcrumb from "../../components/Breadcrumb/NavigationBreadcrumb";
import "./DieuKhoanSuDung.scss";

export default function DieuKhoanSuDung() {
  return (
    <div className="terms-container">
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
              label: "Điều khoản sử dụng",
            },
          ]}
        />
      </div>

      <div className="terms-header">
        <div className="container">
          <h1>
            ĐIỀU KIỆN VÀ ĐIỀU KHOẢN SỬ DỤNG DỊCH VỤ TƯ VẤN Y TẾ TRỰC TUYẾN
          </h1>
          <p className="subtitle">CỦA DỰ ÁN CÁ NHÂN "MEDCONNECT"</p>
          <p className="effective-date">
            Hiệu lực: 01/01/2025 – Cập nhật lần cuối: 01/01/2025
          </p>
        </div>
      </div>

      <div className="terms-content">
        <div className="container">
          <div className="terms-text">
            <p className="intro">
              Điều kiện và Điều khoản sử dụng dịch vụ tư vấn y tế trực tuyến này
              ("Điều khoản") quy định mối quan hệ, quyền và nghĩa vụ giữa
              MedConnect ("Nền tảng", "chúng tôi") và người sử dụng dịch vụ
              ("Người dùng", "bạn") khi đăng ký tài khoản, đặt lịch và tham gia
              các buổi tư vấn y tế trực tuyến với bác sĩ thông qua website hoặc
              ứng dụng của MedConnect.
            </p>

            <h2>1. GIẢI THÍCH THUẬT NGỮ</h2>

            <p>
              <strong>a. Tư vấn y tế trực tuyến</strong> là hình thức trao đổi
              thông tin, giải đáp, định hướng hoặc hướng dẫn chăm sóc sức khỏe
              từ xa giữa bác sĩ hợp tác với MedConnect và người dùng thông qua
              Internet (Zoom, ZEGOCLOUD, Google Meet, hoặc công cụ tích hợp
              khác).
            </p>

            <p>
              <strong>b. Lời khuyên y tế</strong> là thông tin, ý kiến chuyên
              môn được bác sĩ cung cấp trong quá trình tư vấn, dựa trên dữ liệu
              và triệu chứng do bạn cung cấp.
            </p>

            <p>
              <strong>c. Người dùng</strong> là bất kỳ cá nhân nào đăng ký tài
              khoản và sử dụng dịch vụ trên nền tảng MedConnect, bao gồm bệnh
              nhân, thân nhân hoặc người được ủy quyền.
            </p>

            <h2>2. NGUYÊN TẮC VÀ PHẠM VI ÁP DỤNG</h2>

            <p>
              Dịch vụ tư vấn y tế trực tuyến không thay thế cho khám chữa bệnh
              trực tiếp, chẩn đoán, điều trị hay kê đơn trong tình huống khẩn
              cấp.
            </p>

            <p>
              Bạn chỉ nên sử dụng dịch vụ khi tình trạng sức khỏe ổn định, không
              cần cấp cứu. Trong trường hợp khẩn cấp, hãy đến ngay cơ sở y tế
              gần nhất hoặc gọi số cấp cứu địa phương.
            </p>

            <p>
              Bác sĩ và bạn có quyền tạm dừng hoặc kết thúc buổi tư vấn bất cứ
              lúc nào nếu thấy cần thiết hoặc không đủ thông tin để đảm bảo an
              toàn chuyên môn.
            </p>

            <p>
              Việc bạn đặt lịch và tham gia tư vấn được hiểu là bạn đã đọc, hiểu
              và đồng ý với toàn bộ Điều khoản này.
            </p>

            <h2>3. QUYỀN VÀ TRÁCH NHIỆM CỦA NGƯỜI DÙNG</h2>

            <h3>3.1. Quyền của bạn</h3>
            <ul>
              <li>
                Lựa chọn bác sĩ, thời gian tư vấn và hình thức thanh toán theo
                quy định.
              </li>
              <li>
                Được bảo mật thông tin cá nhân và dữ liệu y tế theo Chính sách
                bảo vệ dữ liệu cá nhân của MedConnect.
              </li>
              <li>
                Được hủy hoặc đổi lịch tư vấn theo chính sách hiện hành (nếu
                có).
              </li>
            </ul>

            <h3>3.2. Nghĩa vụ của bạn</h3>
            <ul>
              <li>
                Cung cấp thông tin y tế chính xác, trung thực và đầy đủ (bệnh
                sử, thuốc đang dùng, dị ứng, kết quả xét nghiệm…).
              </li>
              <li>
                Không sử dụng dịch vụ cho người khác khi chưa được họ đồng ý hợp
                pháp.
              </li>
              <li>
                Không ghi âm, quay video, chụp màn hình hoặc chia sẻ lại nội
                dung buổi tư vấn nếu chưa được bác sĩ hoặc MedConnect đồng ý
                bằng văn bản.
              </li>
              <li>
                Thanh toán đầy đủ chi phí (nếu có) trước khi buổi tư vấn bắt
                đầu.
              </li>
              <li>
                Tự chịu trách nhiệm về việc áp dụng các lời khuyên được cung
                cấp; hiểu rằng đây không phải là chẩn đoán y khoa đầy đủ.
              </li>
            </ul>

            <h2>4. TRÁCH NHIỆM VÀ GIỚI HẠN CỦA MEDCONNECT</h2>

            <h3>4.1. Về nội dung tư vấn</h3>
            <p>
              MedConnect kết nối người dùng với bác sĩ đã được xác minh. Tuy
              nhiên, nền tảng không chịu trách nhiệm về tính chính xác chuyên
              môn, hiệu quả điều trị hay kết quả áp dụng lời khuyên của bác sĩ.
            </p>
            <p>
              Các thông tin bác sĩ cung cấp chỉ nhằm tham khảo và hỗ trợ ra
              quyết định chăm sóc sức khỏe, không thay thế cho khám chữa bệnh
              trực tiếp.
            </p>

            <h3>4.2. Về hạ tầng kỹ thuật</h3>
            <p>
              MedConnect hoạt động dựa trên dịch vụ Internet, máy chủ, và bên
              thứ ba (ZEGOCLOUD/Agora, Google Maps, Firebase, VNPAY/MoMo...).
              Chúng tôi nỗ lực duy trì hệ thống ổn định nhưng không thể bảo đảm
              dịch vụ luôn liên tục, không gián đoạn hoặc không lỗi kỹ thuật.
            </p>
            <p>
              Trong trường hợp xảy ra sự cố (mất kết nối, lỗi video, gián đoạn
              server…), MedConnect sẽ cố gắng khắc phục hoặc hoàn lịch trong
              thời gian sớm nhất.
            </p>

            <h3>4.3. Miễn trừ trách nhiệm</h3>
            <p>MedConnect không chịu trách nhiệm pháp lý cho:</p>
            <ul>
              <li>
                Việc bạn sử dụng hoặc không sử dụng lời khuyên của bác sĩ;
              </li>
              <li>
                Mọi thiệt hại phát sinh do thông tin y tế cung cấp không chính
                xác;
              </li>
              <li>
                Rủi ro kỹ thuật, tấn công mạng, hoặc sự cố từ hạ tầng bên thứ
                ba;
              </li>
              <li>
                Việc rò rỉ dữ liệu do lỗi thiết bị hoặc hành vi của người dùng.
              </li>
            </ul>

            <h3>4.4. Ghi âm, ghi hình</h3>
            <p>
              Để đảm bảo chất lượng dịch vụ và an toàn pháp lý, buổi tư vấn có
              thể được ghi âm hoặc ghi hình theo quy định. Tất cả dữ liệu này
              được bảo mật và chỉ sử dụng cho mục đích kiểm tra, khiếu nại hoặc
              đào tạo nội bộ; không được công khai trừ khi có yêu cầu hợp pháp
              của cơ quan có thẩm quyền.
            </p>

            <h2>5. QUY ĐỊNH VỀ BẢO MẬT VÀ DỮ LIỆU</h2>

            <p>
              MedConnect tuân thủ Nghị định 13/2023/NĐ-CP và Thông tư
              49/2017/TT-BYT trong việc bảo vệ dữ liệu cá nhân và dữ liệu y tế.
            </p>

            <p>
              Dữ liệu của bạn (hồ sơ, đơn thuốc, tóm tắt tư vấn, lịch hẹn, thông
              tin thanh toán) được mã hóa và lưu trữ an toàn.
            </p>

            <p>
              Bạn có quyền yêu cầu truy cập, chỉnh sửa hoặc xóa dữ liệu cá nhân
              bằng cách gửi email đến: privacy@medconnect.vn
            </p>

            <p>
              MedConnect không chia sẻ dữ liệu của bạn cho bên thứ ba ngoài phạm
              vi cung cấp dịch vụ, trừ khi có đồng ý hợp pháp hoặc yêu cầu của
              cơ quan nhà nước.
            </p>

            <h2>6. TẠM NGƯNG, TỪ CHỐI HOẶC CHẤM DỨT DỊCH VỤ</h2>

            <p>
              MedConnect có quyền từ chối hoặc chấm dứt dịch vụ trong các trường
              hợp:
            </p>
            <ul>
              <li>Người dùng vi phạm Điều khoản này;</li>
              <li>Cung cấp thông tin sai lệch, gian lận;</li>
              <li>Có hành vi xúc phạm bác sĩ hoặc nhân viên hỗ trợ;</li>
              <li>
                Có yêu cầu từ cơ quan chức năng hoặc lý do an ninh, kỹ thuật.
              </li>
            </ul>

            <p>
              Nếu không đồng ý với bản cập nhật Điều khoản mới, bạn có thể ngừng
              sử dụng dịch vụ. Việc tiếp tục sử dụng được hiểu là đồng ý chấp
              thuận nội dung mới.
            </p>

            <h2>7. THANH TOÁN VÀ HOÀN TIỀN (NẾU ÁP DỤNG)</h2>

            <p>Phí tư vấn được hiển thị rõ trước khi đặt lịch.</p>

            <ul>
              <li>
                Hoàn tiền 100% nếu bác sĩ hủy hoặc không thể thực hiện buổi tư
                vấn.
              </li>
              <li>
                Nếu bạn hủy trước 24 giờ: hoàn 50% (trừ phí cổng thanh toán nếu
                có).
              </li>
              <li>Nếu hủy sau 24 giờ hoặc vắng mặt: không hoàn.</li>
              <li>
                Thời gian hoàn tiền: tối đa 05 ngày làm việc qua cùng phương
                thức thanh toán.
              </li>
            </ul>

            <h2>8. KHIẾU NẠI, KHIẾU KIỆN</h2>

            <p>
              Mọi thắc mắc hoặc khiếu nại về dịch vụ, bạn có thể gửi về
              support@medconnect.vn hoặc qua trang /contact.
            </p>

            <p>
              Trường hợp không giải quyết được, tranh chấp sẽ được xử lý theo
              pháp luật Việt Nam, ưu tiên thương lượng – hòa giải trước khi đưa
              ra Tòa án có thẩm quyền.
            </p>

            <h2>9. ĐIỀU KHOẢN KHÁC</h2>

            <p>Điều khoản này được diễn giải theo pháp luật Việt Nam.</p>

            <p>
              Một số nội dung có thể được điều chỉnh, bổ sung định kỳ để phù hợp
              quy định y tế và công nghệ.
            </p>

            <p>
              Khi tham gia tư vấn, bạn xác nhận đã đọc, hiểu và đồng ý với toàn
              bộ nội dung trong văn bản này.
            </p>

            <div className="contact-info">
              <h2>THÔNG TIN LIÊN HỆ</h2>
              <p>
                <strong>Dự án MedConnect</strong> (nền tảng tư vấn y tế trực
                tuyến cá nhân)
              </p>
              <p>
                <strong>Email hỗ trợ:</strong> support@medconnect.vn
              </p>
              <p>
                <strong>Email bảo mật dữ liệu:</strong> privacy@medconnect.vn
              </p>
              <p>
                <strong>Trang web:</strong> https://medconnect.vn
              </p>
              <p>
                <strong>Người phụ trách:</strong> Nhóm Phát Triển
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
