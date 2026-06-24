const fs = require('fs');
const path = require('path');
const Template = require('../models/Template');
const Job = require('../models/Job');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

async function seedDefaultTemplates() {
  try {
    const count = await Template.countDocuments();
    if (count === 0) {
      const defaultTemplates = [
        {
          id: "temp-deploy",
          title: "Quy trình Triển khai Production",
          description: "Checklist các bước deploy hệ thống lên server production, đảm bảo an toàn và không downtime.",
          steps: [
            { id: "step-1", title: "Backup Database", description: "Chạy backup database hiện tại và lưu vào thư mục dự phòng." },
            { id: "step-2", title: "Pull code mới", description: "Pull code mới nhất từ nhánh release/main trên repo." },
            { id: "step-3", title: "Cài đặt dependencies", description: "Chạy npm install hoặc pip install để cập nhật thư viện." },
            { id: "step-4", title: "Chạy Migrations", description: "Áp dụng các thay đổi database schema mới." },
            { id: "step-5", title: "Build Assets", description: "Build frontend assets (CSS, JS) cho bản release mới." },
            { id: "step-6", title: "Restart Services", description: "Restart app service (PM2, systemd, Docker container)." },
            { id: "step-7", title: "Kiểm tra khói (Smoke Test)", description: "Truy cập các API chính để kiểm tra hệ thống hoạt động ổn định." }
          ]
        },
        {
          id: "temp-video",
          title: "Quy trình Lồng tiếng & Làm Video",
          description: "Checklist từng bước từ khi nhận yêu cầu dịch/lồng tiếng cho đến khi render video thành phẩm.",
          steps: [
            { id: "step-1", title: "Dịch tài liệu / Lên Kịch bản", description: "Dịch nội dung từ video nguồn hoặc viết kịch bản tiếng Việt." },
            { id: "step-2", title: "Tạo giọng đọc (TTS)", description: "Dùng dịch vụ TTS tạo file âm thanh lồng tiếng từ kịch bản." },
            { id: "step-3", title: "Tạo phụ đề (Subtitles)", description: "Tạo và căn chỉnh thời gian file SRT/ASS trùng khớp với âm thanh." },
            { id: "step-4", title: "Mix âm thanh", description: "Lọc nhiễu âm thanh giọng đọc, chèn nhạc nền nhẹ, cân bằng âm lượng." },
            { id: "step-5", title: "Render video", description: "Ghép âm thanh lồng tiếng, phụ đề cứng (burn-in) vào video gốc và render." },
            { id: "step-6", title: "Review chất lượng", description: "Xem lại video cuối cùng kiểm tra lệch tiếng, sai chính tả phụ đề." }
          ]
        },
        {
          id: "temp-ezserve",
          title: "Quy trình Cài đặt Hệ thống EzServe",
          description: "Checklist các bước thiết lập và di chuyển hệ thống EzServe từ máy mẫu sang máy mới.",
          steps: [
            { id: "ez-step-1", title: "Chuẩn bị & sao chép XAMPP", description: "Dừng dịch vụ XAMPP trên máy mẫu, nén thư mục C:\\xampp thành xampp.zip, giải nén vào C:\\ trên máy mới và chạy xampp-control.exe. Cho phép Apache và MySQL qua Firewall." },
            { id: "ez-step-2", title: "Cài đặt Python & thư viện", description: "Cài đặt Python, chạy 'pip install -r requirements.txt'. Thêm PATH: C:\\Users\\ADMIN\\AppData\\Local\\Programs\\Python\\Python313\\Scripts\\" },
            { id: "ez-step-3", title: "Cài Node.js & Puppeteer", description: "Cài đặt Node.js. Chạy 'npm install puppeteer' tại C:\\xampp\\htdocs. Thêm PATH: C:\\Program Files\\nodejs\\" },
            { id: "ez-step-4", title: "Cài thư viện mã hóa Python", description: "Cài đặt pycryptodome bằng lệnh: python -m pip install pycryptodome" },
            { id: "ez-step-5", title: "Cài đặt wkhtmltoimage / wkhtmltopdf", description: "Cài đặt bộ công cụ từ wkhtmltopdf.org và thêm vào PATH: C:\\Program Files\\wkhtmltopdf\\bin" },
            { id: "ez-step-6", title: "Cài đặt SumatraPDF", description: "Cài đặt SumatraPDF từ trang chính và thêm vào PATH: C:\\Program Files\\SumatraPDF\\" },
            { id: "ez-step-7", title: "Kiểm tra & khởi chạy", description: "Truy cập http://127.0.0.1/, kiểm tra phân quyền htdocs, liên hệ hỗ trợ cấp license nếu cần: 097 553 5678" },
            { id: "ez-step-8", title: "Các lưu ý chuyển máy (Checklist kiểm tra)", description: "Sao lưu database MySQL, sao chép cron jobs, kiểm tra các đường dẫn tuyệt đối trong mã nguồn, đặt lại quyền file và kiểm tra firewall/ports (80, 443, 3306...)" }
          ]
        }
      ];
      await Template.insertMany(defaultTemplates);
      console.log('Seeded default templates successfully.');
    }
  } catch (err) {
    console.error('Error seeding templates:', err);
  }
}

async function migrateDataFromJSON() {
  try {
    const templatesCount = await Template.countDocuments();
    const jobsCount = await Job.countDocuments();
    
    // Only migrate if both MongoDB collections are empty and data/db.json exists
    if (templatesCount === 0 && jobsCount === 0 && fs.existsSync(DB_FILE)) {
      console.log('Found local db.json. Migrating data to MongoDB...');
      const rawData = fs.readFileSync(DB_FILE, 'utf-8');
      const jsonData = JSON.parse(rawData);
      
      if (jsonData.templates && jsonData.templates.length > 0) {
        await Template.insertMany(jsonData.templates);
        console.log(`Migrated ${jsonData.templates.length} templates.`);
      }
      
      if (jsonData.jobs && jsonData.jobs.length > 0) {
        await Job.insertMany(jsonData.jobs);
        console.log(`Migrated ${jsonData.jobs.length} jobs.`);
      }
      
      // Rename local db.json to db.json.bak to prevent future migration attempts
      try {
        fs.renameSync(DB_FILE, `${DB_FILE}.bak`);
        console.log('Renamed db.json to db.json.bak');
      } catch (renameErr) {
        console.error('Failed to rename db.json:', renameErr);
      }
      
      console.log('Migration completed successfully.');
    } else {
      // If MongoDB is already populated or local db.json is missing, seed defaults if empty
      await seedDefaultTemplates();
    }

    // Ensure the new EzServe template is also seeded specifically
    const hasEzServe = await Template.findOne({ id: "temp-ezserve" });
    if (!hasEzServe) {
      const ezserveTemplate = {
        id: "temp-ezserve",
        title: "Quy trình Cài đặt Hệ thống EzServe",
        description: "Checklist các bước thiết lập và di chuyển hệ thống EzServe từ máy mẫu sang máy mới.",
        steps: [
          { id: "ez-step-1", title: "Chuẩn bị & sao chép XAMPP", description: "Dừng dịch vụ XAMPP trên máy mẫu, nén thư mục C:\\xampp thành xampp.zip, giải nén vào C:\\ trên máy mới và chạy xampp-control.exe. Cho phép Apache và MySQL qua Firewall." },
          { id: "ez-step-2", title: "Cài đặt Python & thư viện", description: "Cài đặt Python, chạy 'pip install -r requirements.txt'. Thêm PATH: C:\\Users\\ADMIN\\AppData\\Local\\Programs\\Python\\Python313\\Scripts\\" },
          { id: "ez-step-3", title: "Cài Node.js & Puppeteer", description: "Cài đặt Node.js. Chạy 'npm install puppeteer' tại C:\\xampp\\htdocs. Thêm PATH: C:\\Program Files\\nodejs\\" },
          { id: "ez-step-4", title: "Cài thư viện mã hóa Python", description: "Cài đặt pycryptodome bằng lệnh: python -m pip install pycryptodome" },
          { id: "ez-step-5", title: "Cài đặt wkhtmltoimage / wkhtmltopdf", description: "Cài đặt bộ công cụ từ wkhtmltopdf.org và thêm vào PATH: C:\\Program Files\\wkhtmltopdf\\bin" },
          { id: "ez-step-6", title: "Cài đặt SumatraPDF", description: "Cài đặt SumatraPDF từ trang chính và thêm vào PATH: C:\\Program Files\\SumatraPDF\\" },
          { id: "ez-step-7", title: "Kiểm tra & khởi chạy", description: "Truy cập http://127.0.0.1/, kiểm tra phân quyền htdocs, liên hệ hỗ trợ cấp license nếu cần: 097 553 5678" },
          { id: "ez-step-8", title: "Các lưu ý chuyển máy (Checklist kiểm tra)", description: "Sao lưu database MySQL, sao chép cron jobs, kiểm tra các đường dẫn tuyệt đối trong mã nguồn, đặt lại quyền file và kiểm tra firewall/ports (80, 443, 3306...)" }
        ]
      };
      await Template.create(ezserveTemplate);
      console.log('Seeded EzServe template specifically.');
    }

    // Ensure the new LaySo template is also seeded specifically
    const hasLaySo = await Template.findOne({ id: "temp-layso" });
    if (!hasLaySo) {
      const laysoTemplate = {
        id: "temp-layso",
        title: "Setup hệ thống lấy số",
        description: "Quy trình từng bước cài đặt, cấu hình hệ thống lấy số tự động, thiết lập quầy, thiết bị âm thanh và bàn giao.",
        steps: [
          { id: "layso-1", title: "Thực hiện quy trình \"Cài đặt môi trường hệ thống\"", description: "Thiết lập nền tảng, hệ điều hành và môi trường mạng." },
          { id: "layso-2", title: "Cài đặt app Kiosk mới nhất", description: "Cài đặt ứng dụng tại quầy Kiosk." },
          { id: "layso-3", title: "Cài đặt drive máy in bill mới nhất", description: "Driver máy in nhiệt in phiếu số thứ tự." },
          { id: "layso-4", title: "Cài đặt script in bill nodejs", description: "Cài đặt và cấu hình script Node.js để kết nối và đẩy lệnh in." },
          { id: "layso-5", title: "Kiểm tra IP máy chủ, cập nhật cho file config app kiosk, counter, setup.php", description: "Đảm bảo các file cấu hình trỏ đúng địa chỉ IP máy chủ chính." },
          { id: "layso-6", title: "Kiểm tra đường dẫn python, máy in bill trong hệ thống", description: "Kiểm tra PATH và quyền truy cập cổng kết nối máy in." },
          { id: "layso-7", title: "Cấu hình câu gọi số, cách hiển thị giao diện màn hình lấy số, hiển thị số chuyên viên, tivi", description: "Thiết lập âm thanh thông báo và cấu hình màn hình hiển thị." },
          { id: "layso-8", title: "Kiểm tra hệ thống loa", description: "Phát âm thanh thử để đảm bảo loa hoạt động rõ ràng." },
          { id: "layso-9", title: "Kiểm tra bill lấy số", description: "In thử phiếu lấy số, kiểm tra định dạng và thông tin hiển thị." },
          { id: "layso-10", title: "Cấu hình script auto chạy hệ thống khi restart", description: "Cài đặt startup scripts để hệ thống tự khởi chạy khi khởi động lại máy." },
          { id: "layso-11", title: "Cài đặt app Kiora phân hệ chuyên viên cho màn hình 2", description: "Thiết lập ứng dụng gọi số tại quầy của chuyên viên." },
          { id: "layso-12", title: "Cài đặt app Kiora phân hệ tablet", description: "Cấu hình ứng dụng trên máy tính bảng nếu có." },
          { id: "layso-13", title: "Cài đặt đường dẫn mặc định gọi số cho máy chuyên viên", description: "Đặt URL mặc định kết nối trực tiếp đến bảng điều khiển gọi số." },
          { id: "layso-14", title: "Cấu hình quầy lấy số", description: "Định nghĩa số quầy, tên quầy và phân công dịch vụ trong cơ sở dữ liệu." },
          { id: "layso-15", title: "Tạo tài khoản cho chuyên viên", description: "Đăng ký thông tin tài khoản đăng nhập hệ thống cho nhân viên quầy." },
          { id: "layso-16", title: "Bàn giao và hướng dẫn", description: "Hướng dẫn nhân viên cách sử dụng và bàn giao hệ thống cho khách hàng." }
        ]
      };
      await Template.create(laysoTemplate);
      console.log('Seeded LaySo template specifically.');
    }
  } catch (err) {
    console.error('Error during data migration:', err);
    await seedDefaultTemplates();
  }
}

module.exports = {
  migrateDataFromJSON
};
