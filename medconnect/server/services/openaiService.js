// services/openaiClient.js
import OpenAI from "openai";
import dotenv from "dotenv";

// Nạp biến môi trường từ file .env
dotenv.config();

/**
 * Danh sách từ không phù hợp cần lọc
 */
const INAPPROPRIATE_WORDS = [
  // Từ tục tĩu phổ biến
  "dcmm", "đcm", "đcm m", "đcm mày", "đcm mẹ",
  "cmm", "cm m", "cm mày", "cm mẹ",
  "clmm", "clm", "cl m", "cl mày", "cl mẹ",
  "dm", "đm", "đmm", "đmm mày", "đmm mẹ",
  "vl", "vcl", "vkl", "vcc",
  "đjt", "đjt mẹ", "đjt mày",
  "đéo", "đéo biết", "đéo hiểu",
  "đụ", "đụ má", "đụ mẹ",
  "lồn", "buồi", "cặc",
  "chó", "chó má", "chó mẹ",
  "mẹ mày", "má mày",
  // Các biến thể với dấu
  "đcm", "đcmm", "đc m", "đc mày", "đc mẹ",
  "c m", "c mày", "c mẹ",
  "cl m", "cl mày", "cl mẹ",
  "đm mày", "đm mẹ",
  "đjt m", "đjt mày", "đjt mẹ",
  "đéo", "đéo biết", "đéo hiểu",
  "đụ m", "đụ má", "đụ mẹ",
];

/**
 * Chuyển đổi ký tự có dấu thành pattern regex để match cả có dấu và không dấu
 * @param {string} char - Ký tự cần chuyển đổi
 * @returns {string} - Pattern regex
 */
function createAccentPattern(char) {
  const accentMap = {
    'a': '[àáạảãâầấậẩẫăằắặẳẵa]',
    'e': '[èéẹẻẽêềếệểễe]',
    'i': '[ìíịỉĩi]',
    'o': '[òóọỏõôồốộổỗơờớợởỡo]',
    'u': '[ùúụủũưừứựửữu]',
    'y': '[ỳýỵỷỹy]',
    'd': '[đd]',
  };
  
  const lowerChar = char.toLowerCase();
  if (accentMap[lowerChar]) {
    return accentMap[lowerChar];
  }
  return char;
}

/**
 * Tạo pattern regex từ word để match cả có dấu và không dấu
 * @param {string} word - Từ cần tạo pattern
 * @returns {RegExp} - Pattern regex
 */
function createWordPattern(word) {
  let pattern = '';
  for (let i = 0; i < word.length; i++) {
    const char = word[i];
    if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(char)) {
      pattern += createAccentPattern(char);
    } else {
      pattern += char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(pattern, "gi");
}

/**
 * Lọc từ không phù hợp trong text
 * @param {string} text - Text cần lọc
 * @returns {string} - Text đã được lọc
 */
function filterInappropriateWords(text) {
  if (!text || typeof text !== "string") {
    return text;
  }

  let filteredText = text;
  
  // Tạo regex pattern để tìm các từ không phù hợp (case-insensitive, có thể có dấu)
  INAPPROPRIATE_WORDS.forEach((word) => {
    // Tạo pattern để match cả có dấu và không dấu
    const pattern = createWordPattern(word);
    
    filteredText = filteredText.replace(pattern, (match) => {
      // Thay thế bằng dấu * với độ dài tương ứng
      return "*".repeat(match.length);
    });
  });

  return filteredText;
}

// Kiểm tra API key
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.warn("⚠️ OPENAI_API_KEY không được cấu hình trong file .env");
}

// Tạo đối tượng client của OpenAI
const client = apiKey
  ? new OpenAI({
      apiKey: apiKey,
    })
  : null;

/**
 * Tạo system prompt với danh sách chuyên khoa và FAQs
 * @param {Array} specializations - Danh sách chuyên khoa
 * @param {Array} faqs - Danh sách FAQs liên quan
 * @param {boolean} isAuthenticated - Người dùng đã đăng nhập chưa
 * @returns {string} - System prompt
 */
function createSystemPrompt(specializations = [], faqs = [], isAuthenticated = false) {
  let specializationList = "";
  if (specializations && specializations.length > 0) {
    specializationList = "\n\nCác chuyên khoa có sẵn trong hệ thống:\n";
    specializations.forEach((spec, index) => {
      specializationList += `${index + 1}. ${spec.name}`;
      if (spec.description) {
        specializationList += ` - ${spec.description}`;
      }
      specializationList += "\n";
    });
  }

  let faqList = "";
  if (faqs && faqs.length > 0) {
    faqList = "\n\nCác câu hỏi thường gặp liên quan (FAQ):\n";
    faqs.forEach((faq, index) => {
      faqList += `\n${index + 1}. Câu hỏi: ${faq.question}\n`;
      faqList += `   Trả lời: ${faq.answer}\n`;
      if (faq.tags && faq.tags.length > 0) {
        faqList += `   Tags: ${faq.tags.join(", ")}\n`;
      }
      if (faq.links && faq.links.length > 0) {
        faqList += `   Links có sẵn:\n`;
        faq.links.forEach((link) => {
          // Convert absolute URLs to relative paths if needed
          let href = link.href;
          if (href.startsWith("http://") || href.startsWith("https://")) {
            // Extract path from URL
            try {
              const url = new URL(href);
              href = url.pathname;
            } catch (e) {
              // If URL parsing fails, try to extract path manually
              const match = href.match(/https?:\/\/[^\/]+(\/.*)/);
              if (match) {
                href = match[1];
              }
            }
          }
          faqList += `     - ${link.label}: ${href}\n`;
        });
      }
    });
    faqList +=
      "\nLƯU Ý: Nếu câu hỏi của người dùng khớp với FAQ trên, hãy sử dụng câu trả lời từ FAQ làm cơ sở và mở rộng thêm nếu cần. Sử dụng links từ FAQ nếu có.\n";
  }

  const availableRoutes = `
CÁC TRANG/CHỨC NĂNG CÓ SẴN TRONG HỆ THỐNG:
- Đặt lịch khám: /dat-lich
- Tìm bác sĩ: /danh-sach-bac-si hoặc /benh-nhan/tim-bac-si
- Xem chuyên khoa: /chuyen-khoa
- Đăng nhập: /dang-nhap
- Đăng ký: /dang-ky

LƯU Ý QUAN TRỌNG:
- Các trang thông tin cá nhân (hồ sơ bệnh án, lịch hẹn, lịch sử thanh toán) chỉ có thể truy cập sau khi đăng nhập
- Bạn KHÔNG được đưa ra link trực tiếp đến các trang này
- Chỉ hướng dẫn bệnh nhân cách xem (ví dụ: "Sau khi đăng nhập, vào menu để xem lịch hẹn của bạn")
`;

  const authStatus = isAuthenticated 
    ? "\n\n⚠️⚠️⚠️ TRẠNG THÁI NGƯỜI DÙNG: Người dùng ĐÃ ĐĂNG NHẬP ⚠️⚠️⚠️\n" +
      "QUY TẮC QUAN TRỌNG KHI NGƯỜI DÙNG HỎI VỀ ĐẶT LỊCH:\n" +
      "1. Người dùng ĐÃ ĐĂNG NHẬP rồi, không cần đăng ký nữa!\n" +
      "2. Bạn PHẢI đưa ra hướng dẫn cách đặt lịch (chọn chuyên khoa → chọn bác sĩ → chọn thời gian → thanh toán)\n" +
      "3. BẮT BUỘC phải thêm dòng [ACTION:BOOK_APPOINTMENT] ở cuối câu trả lời\n" +
      "4. TUYỆT ĐỐI KHÔNG được đưa ra [ACTION:REGISTER] vì người dùng đã đăng nhập rồi!\n"
    : "\n\n⚠️⚠️⚠️ TRẠNG THÁI NGƯỜI DÙNG: Người dùng CHƯA ĐĂNG NHẬP ⚠️⚠️⚠️\n" +
      "QUY TẮC QUAN TRỌNG KHI NGƯỜI DÙNG HỎI VỀ ĐẶT LỊCH:\n" +
      "1. Người dùng CHƯA ĐĂNG NHẬP, CHƯA CÓ TÀI KHOẢN\n" +
      "2. BẠN PHẢI BẮT ĐẦU câu trả lời bằng: \"Bạn chưa có tài khoản. Bạn cần đăng ký tài khoản mới đặt được lịch.\"\n" +
      "3. TUYỆT ĐỐI KHÔNG được hướng dẫn cách đặt lịch chi tiết (chọn chuyên khoa, bác sĩ, thời gian, thanh toán...) vì họ chưa có tài khoản\n" +
      "4. TUYỆT ĐỐI KHÔNG được nói \"Bạn có thể đặt lịch khám bằng cách...\" vì họ chưa có tài khoản để đặt lịch\n" +
      "5. CHỈ yêu cầu họ đăng ký/đăng nhập trước, sau đó mới có thể đặt lịch\n" +
      "6. BẮT BUỘC phải thêm dòng [ACTION:REGISTER] ở cuối câu trả lời\n" +
      "7. TUYỆT ĐỐI KHÔNG được đưa ra [ACTION:BOOK_APPOINTMENT] vì người dùng chưa đăng nhập!\n" +
      "\nVÍ DỤ CÂU TRẢ LỜI ĐÚNG (BẮT BUỘC PHẢI THEO ĐÚNG FORMAT NÀY):\n" +
      "\"Bạn chưa có tài khoản. Bạn cần đăng ký tài khoản mới đặt được lịch. Hãy đăng ký tài khoản bệnh nhân để bắt đầu.\"\n" +
      "[ACTION:REGISTER]\n" +
      "\nVÍ DỤ CÂU TRẢ LỜI SAI (TUYỆT ĐỐI KHÔNG ĐƯỢC LÀM VẬY):\n" +
      "\"Bạn có thể đặt lịch khám bằng cách: 1) Chọn chuyên khoa, 2) Chọn bác sĩ...\" ← SAI! Vì họ chưa có tài khoản!\n";

  return (
    "Bạn là trợ lý ảo của hệ thống MedConnect - một nền tảng đặt lịch khám bệnh trực tuyến.\n\n" +
    authStatus +
    "NHIỆM VỤ CỦA BẠN (CHỈ 2 NHIỆM VỤ CHÍNH):\n\n" +
    "1. HƯỚNG DẪN SỬ DỤNG HỆ THỐNG:\n" +
    "   - Hướng dẫn cách đăng ký tài khoản, đăng nhập\n" +
    "   - Hướng dẫn cách đặt lịch khám (chọn chuyên khoa → chọn bác sĩ → chọn thời gian → thanh toán)\n" +
    "   - Hướng dẫn các chức năng khác: xem lịch hẹn, thanh toán, xem hồ sơ bệnh án\n" +
    "   - Trả lời câu hỏi về quy trình, dịch vụ của hệ thống\n" +
    "   - Nếu có FAQ liên quan, sử dụng thông tin từ FAQ\n" +
    "   - Khi người dùng hỏi \"tìm bác sĩ\" (ví dụ: \"tìm bác sĩ\", \"tôi muốn tìm bác sĩ\", \"tìm bác sĩ khám...\"):\n" +
    "     * Nếu có kèm triệu chứng/tình trạng: Chuyển sang NHIỆM VỤ 2 (Gợi ý chuyên khoa)\n" +
    "     * Nếu không có triệu chứng: Hướng dẫn vào trang Danh sách bác sĩ để tìm\n" +
    "   - PHÂN BIỆT CÁC LOẠI CÂU HỎI:\n" +
    "     * CÂU HỎI VỀ ĐẶT LỊCH (cần kiểm tra đăng nhập):\n" +
    "       - Từ khóa: \"đặt lịch\", \"đặt hẹn\", \"muốn đặt\", \"làm sao để đặt lịch\", \"cách đặt lịch\", \"đặt lịch khám\"\n" +
    "       - Ví dụ: \"tôi muốn đặt lịch\", \"làm sao để đặt lịch\", \"đặt lịch khám\", \"tôi muốn đặt hẹn\"\n" +
    "       - Với loại câu hỏi này, mới cần kiểm tra đăng nhập và đưa ra action button\n" +
    "     * CÂU HỎI VỀ TƯ VẤN SỨC KHỎE (KHÔNG cần đăng nhập, KHÔNG có action button):\n" +
    "       - Từ khóa: \"khi nào nên\", \"nên khám\", \"có nên\", \"tư vấn\", \"khám tổng quát\", \"nên đi khám\"\n" +
    "       - Ví dụ: \"khi nào nên đi khám tổng quát\", \"có nên khám định kỳ không\", \"nên khám bao lâu một lần\"\n" +
    "       - Với loại câu hỏi này, CHỈ trả lời tư vấn, KHÔNG bắt đăng ký, KHÔNG có action button\n" +
    "     * CÂU HỎI VỀ TÌM BÁC SĨ với triệu chứng: Chuyển sang NHIỆM VỤ 2 (Gợi ý chuyên khoa)\n" +
    "   - Khi người dùng hỏi về ĐẶT LỊCH (ví dụ: 'tôi muốn đặt lịch', 'làm sao để đặt lịch', 'đặt lịch khám'):\n" +
    "     + Nếu TRẠNG THÁI = CHƯA ĐĂNG NHẬP:\n" +
    "       * BẮT BUỘC BẮT ĐẦU câu trả lời bằng: \"Bạn chưa có tài khoản. Bạn cần đăng ký tài khoản mới đặt được lịch.\"\n" +
    "       * TUYỆT ĐỐI KHÔNG được hướng dẫn cách đặt lịch chi tiết (chọn chuyên khoa, bác sĩ, thời gian, thanh toán...)\n" +
    "       * TUYỆT ĐỐI KHÔNG được nói \"Bạn có thể đặt lịch khám bằng cách...\" vì họ chưa có tài khoản\n" +
    "       * CHỈ yêu cầu đăng ký/đăng nhập trước, sau đó mới có thể đặt lịch\n" +
    "       * Câu trả lời BẮT BUỘC phải là: \"Bạn chưa có tài khoản. Bạn cần đăng ký tài khoản mới đặt được lịch. Hãy đăng ký tài khoản bệnh nhân để bắt đầu.\"\n" +
    "       * BẮT BUỘC thêm dòng [ACTION:REGISTER] ở cuối\n" +
    "     + Nếu TRẠNG THÁI = ĐÃ ĐĂNG NHẬP:\n" +
    "       * Đưa ra hướng dẫn chi tiết cách đặt lịch: \"Bạn có thể đặt lịch khám bằng cách: 1) Chọn chuyên khoa, 2) Chọn bác sĩ, 3) Chọn thời gian, 4) Thanh toán.\"\n" +
    "       * BẮT BUỘC thêm dòng [ACTION:BOOK_APPOINTMENT] ở cuối\n" +
    "       * TUYỆT ĐỐI KHÔNG được đưa ra [ACTION:REGISTER] vì người dùng đã đăng nhập rồi!\n" +
    "   - CHỈ đưa ra action button khi người dùng hỏi về đặt lịch (có từ khóa \"đặt lịch\", \"đặt hẹn\")\n" +
    "   - Các câu hỏi về tư vấn sức khỏe (\"khi nào nên\", \"nên khám\") CHỈ trả lời tư vấn, KHÔNG có action button, KHÔNG bắt đăng ký\n" +
    "   - Các câu hỏi khác chỉ hướng dẫn bằng text, không có action button\n\n" +
    "QUAN TRỌNG VỀ THÔNG TIN CÁ NHÂN:\n" +
    "- KHÔNG BAO GIỜ đưa ra link trực tiếp đến các trang thông tin cá nhân\n" +
    "- Khi người dùng hỏi về các thông tin này, CHỈ hướng dẫn cách xem:\n" +
    "  + \"Sau khi đăng nhập, bạn có thể vào menu để xem lịch hẹn của mình\"\n" +
    "  + \"Bạn cần đăng nhập, sau đó vào phần Hồ sơ bệnh án để xem\"\n" +
    "  + \"Để xem lịch sử thanh toán, bạn hãy đăng nhập và vào mục Thanh toán\"\n\n" +
    "2. GỢI Ý CHUYÊN KHOA KHI BỆNH NHÂN MÔ TẢ TÌNH TRẠNG/TRIỆU CHỨNG:\n" +
    "   - Khi người dùng hỏi \"tìm bác sĩ\" kèm triệu chứng (ví dụ: \"tìm bác sĩ khám đau bụng\", \"tôi muốn tìm bác sĩ khám đau đầu\"):\n" +
    "     * BẮT BUỘC phải phân tích triệu chứng và gợi ý chuyên khoa phù hợp TRƯỚC\n" +
    "     * Gợi ý 1-3 chuyên khoa phù hợp nhất từ danh sách có sẵn\n" +
    "     * Liệt kê tên chuyên khoa CHÍNH XÁC như trong danh sách (ví dụ: \"Tiêu hóa\", \"Thần kinh\", \"Tim mạch\")\n" +
    "     * Giải thích ngắn gọn tại sao chuyên khoa đó phù hợp với triệu chứng\n" +
    "     * Sau đó hướng dẫn: \"Bạn có thể tìm bác sĩ chuyên khoa [tên chuyên khoa] bằng cách vào trang Danh sách bác sĩ và lọc theo chuyên khoa.\"\n" +
    "     * Khuyến khích bệnh nhân đặt lịch khám với bác sĩ chuyên khoa đó\n" +
    "   - Ví dụ câu trả lời đúng khi hỏi \"tìm bác sĩ khám đau bụng\":\n" +
    "     \"Với triệu chứng đau bụng, tôi gợi ý bạn nên khám chuyên khoa Tiêu hóa. Chuyên khoa này chuyên điều trị các vấn đề về hệ tiêu hóa như đau bụng, đầy hơi, khó tiêu. Bạn có thể tìm bác sĩ chuyên khoa Tiêu hóa bằng cách vào trang Danh sách bác sĩ và lọc theo chuyên khoa Tiêu hóa.\"\n" +
    "   - Hướng dẫn cách tìm bác sĩ hoặc đặt lịch (bằng text, không đưa link)\n\n" +
    "QUAN TRỌNG:\n" +
    "- KHÔNG BAO GIỜ chẩn đoán bệnh cụ thể hoặc kê đơn thuốc\n" +
    "- KHÔNG thay thế bác sĩ thực tế\n" +
    "- CHỈ hướng dẫn sử dụng hệ thống và gợi ý chuyên khoa phù hợp\n" +
    "- KHÔNG tư vấn y tế chi tiết, chỉ gợi ý chuyên khoa\n" +
    "- Luôn trả lời bằng tiếng Việt, thân thiện và dễ hiểu\n" +
    "- Nếu không chắc chắn về chuyên khoa, hãy khuyên bệnh nhân đến khám trực tiếp\n\n" +
    "QUAN TRỌNG VỀ ACTION BUTTONS:\n" +
    "- CHỈ đưa ra action button khi người dùng hỏi về ĐẶT LỊCH\n" +
    "- Format đặc biệt để frontend hiểu:\n" +
    "  + Nếu TRẠNG THÁI = CHƯA ĐĂNG NHẬP: Thêm dòng [ACTION:REGISTER] ở cuối câu trả lời\n" +
    "  + Nếu TRẠNG THÁI = ĐÃ ĐĂNG NHẬP: Thêm dòng [ACTION:BOOK_APPOINTMENT] ở cuối câu trả lời\n" +
    "- Ví dụ câu trả lời khi hỏi đặt lịch (TRẠNG THÁI = CHƯA ĐĂNG NHẬP):\n" +
    "  \"Bạn chưa có tài khoản. Bạn cần đăng ký tài khoản mới đặt được lịch. Hãy đăng ký tài khoản bệnh nhân để bắt đầu.\"\n" +
    "  [ACTION:REGISTER]\n" +
    "  LƯU Ý: KHÔNG được hướng dẫn chi tiết cách đặt lịch (chọn chuyên khoa, bác sĩ...) khi chưa đăng nhập!\n" +
    "- Ví dụ câu trả lời khi hỏi đặt lịch (TRẠNG THÁI = ĐÃ ĐĂNG NHẬP):\n" +
    "  \"Bạn có thể đặt lịch khám bằng cách: 1) Chọn chuyên khoa, 2) Chọn bác sĩ, 3) Chọn thời gian, 4) Thanh toán.\"\n" +
    "  [ACTION:BOOK_APPOINTMENT]\n" +
    "- Các câu hỏi khác: CHỈ hướng dẫn bằng text, KHÔNG có action button\n" +
    "- KHÔNG sử dụng format markdown links như [text](url)\n" +
    "- KHÔNG đưa ra bất kỳ link nào khác\n\n" +
    availableRoutes +
    specializationList +
    faqList
  );
}

/**
 * Gọi AI của MedConnect
 * @param {string} prompt - câu hỏi hoặc mô tả của bệnh nhân
 * @param {Array} specializations - Danh sách chuyên khoa (optional)
 * @param {Array} messageHistory - Lịch sử tin nhắn trước đó (optional)
 * @param {Array} faqs - Danh sách FAQs liên quan (optional)
 * @param {boolean} isAuthenticated - Người dùng đã đăng nhập chưa (optional)
 * @returns {Promise<string>} - phản hồi của AI
 */
export async function callMedConnectAI(
  prompt,
  specializations = [],
  messageHistory = [],
  faqs = [],
  isAuthenticated = false
) {
  // Kiểm tra API key
  if (!apiKey || !client) {
    console.error("❌ OpenAI API key chưa được cấu hình");
    return "Xin lỗi, dịch vụ AI chưa được cấu hình. Vui lòng liên hệ quản trị viên.";
  }

  // Nếu có FAQ match tốt và câu hỏi đơn giản, có thể trả về trực tiếp (tiết kiệm chi phí)
  // Nhưng để AI có thể mở rộng và giải thích tốt hơn, vẫn gọi AI với FAQ context

  try {
    // Xây dựng messages array
    const messages = [];

    // System prompt với danh sách chuyên khoa và FAQs
    messages.push({
      role: "system",
      content: createSystemPrompt(specializations, faqs, isAuthenticated),
    });

    // Thêm lịch sử tin nhắn (nếu có) - chỉ lấy 5 tin nhắn gần nhất để tiết kiệm token
    if (messageHistory && messageHistory.length > 0) {
      const recentHistory = messageHistory.slice(-5);
      recentHistory.forEach((msg) => {
        messages.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content || msg.text,
        });
      });
    }

    // Thêm thông tin về trạng thái đăng nhập vào user prompt nếu liên quan
    let userPrompt = prompt;
    if (!isAuthenticated && (
      prompt.toLowerCase().includes("đặt lịch") ||
      prompt.toLowerCase().includes("đặt hẹn") ||
      prompt.toLowerCase().includes("khám bệnh") ||
      prompt.toLowerCase().includes("tìm bác sĩ") ||
      prompt.toLowerCase().includes("booking") ||
      prompt.toLowerCase().includes("appointment")
    )) {
      // Không thêm gì vào prompt, để AI tự phát hiện và hướng dẫn
      // Nhưng sẽ thêm vào system prompt
    }
    
    // Thêm prompt hiện tại
    messages.push({ role: "user", content: userPrompt });

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini", // model rẻ, nhanh, tiếng Việt tốt
      messages: messages,
      temperature: 0.7, // Tăng một chút để có phản hồi tự nhiên hơn
      max_tokens: 800, // Tăng để có thể trả lời chi tiết hơn
    });

    // Lấy nội dung phản hồi từ AI
    let aiResponse = response.choices[0].message.content;
    
    // Lọc từ không phù hợp
    aiResponse = filterInappropriateWords(aiResponse);
    
    // Post-process: Kiểm tra xem câu hỏi có phải về đặt lịch không
    const isBookingQuestion = 
      prompt.toLowerCase().includes("đặt lịch") ||
      prompt.toLowerCase().includes("đặt hẹn") ||
      prompt.toLowerCase().includes("muốn đặt") ||
      prompt.toLowerCase().includes("làm sao để đặt") ||
      prompt.toLowerCase().includes("cách đặt lịch");
    
    // Post-process: Kiểm tra xem câu hỏi có phải về tư vấn sức khỏe không
    const isHealthAdviceQuestion = 
      prompt.toLowerCase().includes("khi nào nên") ||
      prompt.toLowerCase().includes("nên khám") ||
      prompt.toLowerCase().includes("có nên") ||
      prompt.toLowerCase().includes("tư vấn") ||
      prompt.toLowerCase().includes("khám tổng quát") ||
      prompt.toLowerCase().includes("nên đi khám") ||
      prompt.toLowerCase().includes("bao lâu") ||
      prompt.toLowerCase().includes("định kỳ");
    
    console.log("🔍 Post-process - Original prompt:", prompt);
    console.log("🔍 Post-process - isBookingQuestion:", isBookingQuestion);
    console.log("🔍 Post-process - isHealthAdviceQuestion:", isHealthAdviceQuestion);
    console.log("🔍 Post-process - isAuthenticated:", isAuthenticated);
    console.log("🔍 Post-process - AI response contains BOOK_APPOINTMENT:", aiResponse.includes("[ACTION:BOOK_APPOINTMENT]"));
    console.log("🔍 Post-process - AI response contains REGISTER:", aiResponse.includes("[ACTION:REGISTER]"));
    
    // Nếu là câu hỏi về tư vấn sức khỏe, loại bỏ tất cả action buttons
    if (isHealthAdviceQuestion) {
      console.log("🔍 Post-process - Health advice question detected, removing all action buttons");
      aiResponse = aiResponse.replace(/\[ACTION:REGISTER\]/g, "");
      aiResponse = aiResponse.replace(/\[ACTION:BOOK_APPOINTMENT\]/g, "");
      aiResponse = aiResponse.trim();
    }
    // Chỉ xử lý action button nếu là câu hỏi về đặt lịch
    else if (isBookingQuestion) {
      // Post-process: Đảm bảo action button đúng với trạng thái đăng nhập
      // Nếu chưa đăng nhập nhưng AI đưa ra [ACTION:BOOK_APPOINTMENT] → thay bằng [ACTION:REGISTER]
      // Nếu đã đăng nhập nhưng AI đưa ra [ACTION:REGISTER] → thay bằng [ACTION:BOOK_APPOINTMENT]
      
      if (!isAuthenticated) {
        // Chưa đăng nhập: chỉ được có [ACTION:REGISTER]
        if (aiResponse.includes("[ACTION:BOOK_APPOINTMENT]")) {
          console.log("⚠️ AI returned BOOK_APPOINTMENT for unauthenticated user, replacing with REGISTER");
          aiResponse = aiResponse.replace(/\[ACTION:BOOK_APPOINTMENT\]/g, "[ACTION:REGISTER]");
        }
        
        // Kiểm tra xem AI có hướng dẫn cách đặt lịch chi tiết không (sai)
        // Kiểm tra nhiều pattern để chắc chắn bắt được
        const hasDetailedInstructions = 
          aiResponse.includes("Chọn chuyên khoa") ||
          aiResponse.includes("chọn chuyên khoa") ||
          aiResponse.includes("Chọn bác sĩ") ||
          aiResponse.includes("chọn bác sĩ") ||
          aiResponse.includes("Chọn thời gian") ||
          aiResponse.includes("chọn thời gian") ||
          aiResponse.includes("Bạn có thể đặt lịch khám bằng cách") ||
          aiResponse.includes("bạn có thể đặt lịch khám bằng cách") ||
          aiResponse.includes("đặt lịch khám bằng cách") ||
          aiResponse.includes("1) Chọn") ||
          aiResponse.includes("1) chọn") ||
          aiResponse.includes("2) Chọn") ||
          aiResponse.includes("2) chọn") ||
          aiResponse.includes("3) Chọn") ||
          aiResponse.includes("3) chọn") ||
          aiResponse.includes("4) Chọn") ||
          aiResponse.includes("4) chọn") ||
          aiResponse.includes("Thanh toán");
        
        // Kiểm tra xem AI có nói đúng câu "Bạn chưa có tài khoản" chưa
        const hasCorrectMessage = 
          aiResponse.includes("Bạn chưa có tài khoản") ||
          aiResponse.includes("bạn chưa có tài khoản");
        
        console.log("🔍 Post-process - hasDetailedInstructions:", hasDetailedInstructions);
        console.log("🔍 Post-process - hasCorrectMessage:", hasCorrectMessage);
        console.log("🔍 Post-process - Full AI response:", aiResponse);
        
        // Nếu AI hướng dẫn chi tiết hoặc không nói đúng câu, thay thế toàn bộ
        if (hasDetailedInstructions || !hasCorrectMessage) {
          console.log("⚠️ AI provided wrong response for unauthenticated user, replacing with correct message");
          console.log("🔍 Original AI response:", aiResponse);
          // Thay thế toàn bộ bằng câu trả lời đúng
          aiResponse = "Bạn chưa có tài khoản. Bạn cần đăng ký tài khoản mới đặt được lịch. Hãy đăng ký tài khoản bệnh nhân để bắt đầu.\n[ACTION:REGISTER]";
          console.log("🔍 Replaced with:", aiResponse);
        }
        
        // Đảm bảo không có [ACTION:REGISTER] nào khác, chỉ giữ lại một
        const registerMatches = aiResponse.match(/\[ACTION:REGISTER\]/g);
        if (registerMatches && registerMatches.length > 1) {
          // Giữ lại chỉ một [ACTION:REGISTER] ở cuối
          aiResponse = aiResponse.replace(/\[ACTION:REGISTER\]/g, "");
          aiResponse = aiResponse.trim() + "\n[ACTION:REGISTER]";
        }
      } else {
        // Đã đăng nhập: chỉ được có [ACTION:BOOK_APPOINTMENT]
        if (aiResponse.includes("[ACTION:REGISTER]")) {
          console.log("⚠️ AI returned REGISTER for authenticated user, replacing with BOOK_APPOINTMENT");
          aiResponse = aiResponse.replace(/\[ACTION:REGISTER\]/g, "[ACTION:BOOK_APPOINTMENT]");
        }
        // Đảm bảo không có [ACTION:BOOK_APPOINTMENT] nào khác, chỉ giữ lại một
        const bookMatches = aiResponse.match(/\[ACTION:BOOK_APPOINTMENT\]/g);
        if (bookMatches && bookMatches.length > 1) {
          // Giữ lại chỉ một [ACTION:BOOK_APPOINTMENT] ở cuối
          aiResponse = aiResponse.replace(/\[ACTION:BOOK_APPOINTMENT\]/g, "");
          aiResponse = aiResponse.trim() + "\n[ACTION:BOOK_APPOINTMENT]";
        }
      }
    }
    
    console.log("🔍 Post-process - Final response contains BOOK_APPOINTMENT:", aiResponse.includes("[ACTION:BOOK_APPOINTMENT]"));
    console.log("🔍 Post-process - Final response contains REGISTER:", aiResponse.includes("[ACTION:REGISTER]"));
    
    // Post-process: Convert any absolute URLs in markdown links to relative paths
    // Pattern: [text](https://.../path) -> [text](/path)
    aiResponse = aiResponse.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\/]+)(\/[^\)]+)\)/g,
      (match, text, domain, path) => {
        // Extract just the path from absolute URL
        return `[${text}](${path})`;
      }
    );
    
    // Also handle cases where AI might return just absolute URLs without markdown
    aiResponse = aiResponse.replace(
      /(https?:\/\/[^\/]+)(\/[^\s\)]+)/g,
      (match, domain, path) => {
        return path;
      }
    );
    
    return aiResponse;
  } catch (error) {
    console.error("❌ Lỗi gọi OpenAI:", error);

    // Phân biệt các loại lỗi
    if (error.status === 429) {
      // Quota exceeded hoặc rate limit
      if (error.code === "insufficient_quota") {
        console.error("❌ OpenAI API: Quota đã hết. Vui lòng kiểm tra billing.");
        return "Xin lỗi, dịch vụ AI tạm thời không khả dụng do đã hết quota. Vui lòng thử lại sau hoặc liên hệ quản trị viên.";
      } else {
        console.error("❌ OpenAI API: Rate limit exceeded");
        return "Xin lỗi, quá nhiều yêu cầu. Vui lòng đợi một chút rồi thử lại.";
      }
    } else if (error.status === 401) {
      // Invalid API key
      console.error("❌ OpenAI API: API key không hợp lệ");
      return "Xin lỗi, dịch vụ AI chưa được cấu hình đúng. Vui lòng liên hệ quản trị viên.";
    } else if (error.status === 500 || error.status >= 500) {
      // Server error
      console.error("❌ OpenAI API: Lỗi server");
      return "Xin lỗi, dịch vụ AI đang gặp sự cố. Vui lòng thử lại sau.";
    } else {
      // Other errors
      console.error("❌ OpenAI API: Lỗi không xác định", error.message);
      return "Xin lỗi, tôi đang gặp sự cố. Bạn vui lòng thử lại sau nhé.";
    }
  }
}

/**
 * AI gợi ý phương pháp điều trị dựa trên chẩn đoán
 * @param {Array} diagnoses - Danh sách chẩn đoán
 * @param {Object} patientInfo - Thông tin bệnh nhân (tuổi, giới tính, tiền sử...)
 * @param {Array} existingMedications - Thuốc đang dùng (nếu có)
 * @param {Object} context - Thông tin bổ sung (vitals, labResults...)
 * @returns {Promise<Object>} - Gợi ý điều trị từ AI
 */
export async function suggestTreatmentMethod(
  diagnoses = [],
  patientInfo = {},
  existingMedications = [],
  context = {}
) {
  // Kiểm tra API key
  if (!apiKey || !client) {
    console.error("❌ OpenAI API key chưa được cấu hình");
    throw new Error("OpenAI API key chưa được cấu hình");
  }

  if (!diagnoses || diagnoses.length === 0) {
    throw new Error("Cần có ít nhất một chẩn đoán để gợi ý điều trị");
  }

  try {
    // Xây dựng system prompt cho AI
    const systemPrompt = `Bạn là trợ lý AI hỗ trợ bác sĩ trong việc đưa ra phương pháp điều trị.

NHIỆM VỤ CỦA BẠN:
1. Dựa trên chẩn đoán của bác sĩ, đưa ra phương pháp điều trị phù hợp
2. Gợi ý thuốc (nếu cần) với liều lượng và hướng dẫn sử dụng
3. Đưa ra hướng dẫn theo dõi và tái khám

QUAN TRỌNG:
- Đây CHỈ là gợi ý tham khảo, KHÔNG thay thế quyết định của bác sĩ
- Bác sĩ PHẢI xem xét và verify trước khi áp dụng
- Luôn cân nhắc thông tin bệnh nhân (tuổi, giới tính, tiền sử, dị ứng...)
- Tránh gợi ý thuốc có thể tương tác với thuốc đang dùng
- Đưa ra phương pháp điều trị theo chuẩn y tế hiện đại

FORMAT TRẢ VỀ (JSON):
{
  "treatmentMethod": "Mô tả chi tiết phương pháp điều trị...",
  "suggestedMedications": [
    {
      "name": "Tên thuốc",
      "instruction": "Cách sử dụng",
      "quantity": "Liều lượng"
    }
  ],
  "followUpInstructions": "Hướng dẫn theo dõi và tái khám...",
  "notes": "Ghi chú bổ sung (nếu có)"
}

LƯU Ý:
- Trả về JSON hợp lệ, dễ parse
- Nếu không chắc chắn, hãy đề xuất bác sĩ tham khảo thêm tài liệu
- Luôn nhấn mạnh rằng đây là gợi ý, cần bác sĩ verify`;

    // Xây dựng user prompt với thông tin đầy đủ
    let userPrompt = `Dựa trên thông tin sau, hãy đưa ra gợi ý phương pháp điều trị:\n\n`;

    // Chẩn đoán
    userPrompt += `CHẨN ĐOÁN:\n`;
    diagnoses.forEach((diag, index) => {
      userPrompt += `${index + 1}. ${diag.name}\n`;
    });
    userPrompt += `\n`;

    // Thông tin bệnh nhân
    if (patientInfo.age || patientInfo.gender || patientInfo.medicalHistory) {
      userPrompt += `THÔNG TIN BỆNH NHÂN:\n`;
      if (patientInfo.age) userPrompt += `- Tuổi: ${patientInfo.age}\n`;
      if (patientInfo.gender) userPrompt += `- Giới tính: ${patientInfo.gender}\n`;
      if (patientInfo.allergyNotes) userPrompt += `- Dị ứng: ${patientInfo.allergyNotes}\n`;
      if (patientInfo.medicalHistory && patientInfo.medicalHistory.length > 0) {
        userPrompt += `- Tiền sử: ${patientInfo.medicalHistory.join(", ")}\n`;
      }
      userPrompt += `\n`;
    }

    // Thuốc đang dùng
    if (existingMedications && existingMedications.length > 0) {
      userPrompt += `THUỐC ĐANG DÙNG:\n`;
      existingMedications.forEach((med, index) => {
        userPrompt += `${index + 1}. ${med.name} - ${med.instruction || ""}\n`;
      });
      userPrompt += `\n`;
    }

    // Context bổ sung (vitals, lab results...)
    if (context.vitals) {
      userPrompt += `CHỈ SỐ SINH TỒN:\n`;
      if (context.vitals.bloodPressure) userPrompt += `- Huyết áp: ${context.vitals.bloodPressure}\n`;
      if (context.vitals.heartRate) userPrompt += `- Nhịp tim: ${context.vitals.heartRate} bpm\n`;
      if (context.vitals.temperature) userPrompt += `- Nhiệt độ: ${context.vitals.temperature}°C\n`;
      userPrompt += `\n`;
    }

    if (context.labResults && context.labResults.length > 0) {
      userPrompt += `KẾT QUẢ XÉT NGHIỆM:\n`;
      context.labResults.forEach((lab, index) => {
        userPrompt += `${index + 1}. ${lab.testName}: ${lab.result}\n`;
      });
      userPrompt += `\n`;
    }

    userPrompt += `Hãy đưa ra gợi ý phương pháp điều trị phù hợp dựa trên thông tin trên.`;

    // Gọi OpenAI API
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: "json_object" }, // Yêu cầu trả về JSON
    });

    // Parse response
    const aiResponse = response.choices[0].message.content;
    let treatmentSuggestion;

    try {
      treatmentSuggestion = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error("❌ Lỗi parse JSON từ AI:", parseError);
      // Fallback: thử extract JSON từ text
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        treatmentSuggestion = JSON.parse(jsonMatch[0]);
      } else {
        // Nếu không parse được, trả về format mặc định
        treatmentSuggestion = {
          treatmentMethod: aiResponse,
          suggestedMedications: [],
          followUpInstructions: "Vui lòng tham khảo thêm tài liệu y tế.",
          notes: "Lưu ý: Đây là gợi ý từ AI, bác sĩ cần verify trước khi áp dụng.",
        };
      }
    }

    // Đảm bảo có các trường cần thiết
    return {
      treatmentMethod: treatmentSuggestion.treatmentMethod || "Không có gợi ý cụ thể. Vui lòng tham khảo tài liệu y tế.",
      suggestedMedications: treatmentSuggestion.suggestedMedications || [],
      followUpInstructions: treatmentSuggestion.followUpInstructions || "Theo dõi tình trạng bệnh nhân và tái khám khi cần.",
      notes: treatmentSuggestion.notes || "⚠️ Đây là gợi ý từ AI, bác sĩ PHẢI xem xét và verify trước khi áp dụng.",
      aiSuggested: true, // Flag để đánh dấu đây là gợi ý từ AI
    };
  } catch (error) {
    console.error("❌ Lỗi gọi OpenAI để gợi ý điều trị:", error);

    // Phân biệt các loại lỗi
    if (error.status === 429) {
      throw new Error("Quá nhiều yêu cầu. Vui lòng đợi một chút rồi thử lại.");
    } else if (error.status === 401) {
      throw new Error("OpenAI API key không hợp lệ.");
    } else if (error.status === 500 || error.status >= 500) {
      throw new Error("Dịch vụ AI đang gặp sự cố. Vui lòng thử lại sau.");
    } else {
      throw new Error(`Lỗi: ${error.message || "Không thể kết nối với dịch vụ AI"}`);
    }
  }
}