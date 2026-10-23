<p align="right" dir="rtl">
  🌐 <b>زبان:</b> 🇮🇷 فارسی | <a href="./README.md"><b>🇺🇸 English</b></a>
</p>

# تسکرا (Taskera) — فضای کاری هوشمند با بات تلگرام و سینک هوش مصنوعی

<div align="center">

![Taskera Banner](https://img.shields.io/badge/Taskera-Modern_Workspace-4F5AE4?style=for-the-badge&logoColor=white)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Telegram Bot API](https://img.shields.io/badge/Telegram-Bot_API-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)](https://core.telegram.org/bots/api)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

<p align="center">
  یک پلتفرم فول‌استک و مدرن مدیریت تسک و فضای کاری با قابلیت نوتیفیکیشن‌های تلگرام، ایمپورت هوشمند مارک‌داون با هوش مصنوعی، رهگیری زمان و سیستم سطوح دسترسی پیشرفته (RBAC).
</p>

[نمونه آنلاین (پورتفولیو)](https://parham-codes.github.io/portfolio/) • [پروفایل گیت‌هاب](https://github.com/Parham-Codes) • [گزارش باگ یا پیشنهاد](https://github.com/Parham-Codes/taskera/issues)

</div>

---

## 🌟 معرفی پروژه

**تسکرا (Taskera)** برای افزایش بهره‌وری جریان‌های کاری فردی و تیم‌های اشتراکی طراحی شده است. این سیستم سادگی و سرعت مدیریت تسک شخصی را در کنار پایداری و قدرت ابزارهای چندمستأجره (Multi-Tenant) سازمانی در یک ساختار مینیمال، مدرن و پرفورمنس‌محور ارائه می‌دهد.

### 🚀 قابلیت‌های برجسته

- **معماری فضای کاری دوگانه (Dual-Mode):**
  - **فضای شخصی (Solo Mode):** مدیریت بی‌واسطه تسک‌های شخصی بدون نیاز به ساخت سازمان یا پیچیدگی‌های اولیه.
  - **فضای تیمی و سازمانی (Collaborative Mode):** ایجاد و پیوستن به فضاهای کاری تیمی، واگذاری تسک‌ها به اعضا، و پایش وضعیت با کنترل دسترسی نقش‌محور (مالک، مدیر، عضو).
- **⚡ اعلان‌های درلحظه بات تلگرام (Telegram Bot Alerts):**
  - اتصال آسان اکانت تلگرام از طریق Chat ID یا بات اختصاصی.
  - دریافت آنی نوتیفیکیشن‌های فرمت‌شده برای ثبت تسک جدید، تغییر وضعیت‌ها و رویدادهای فضای کاری.
  - دارای سیستم تست اتصال یک‌کلیکه مستقیماً از داخل مودال تنظیمات برنامه.
- **✨ ایمپورت گروهی با هوش مصنوعی و خروجی اکسل:**
  - ساخت ده‌ها تسک در کسری از ثانیه با کپی کردن ساختار متنی هوش مصنوعی (همراه با پرامپت آماده و یکپارچه در سیستم).
  - خروجی‌گیری کامل از تسک‌ها در قالب فایل‌های `.csv` (سازگار با اکسل) یا فایل مارک‌داون `.md`.
- **⏱️ رهگیری زمان و تایمر حرفه‌ای (Time Tracker):**
  - ثبت زمان صرف‌شده روی هر تسک با استفاده از کرونومتر زنده و تفکیک شده.
  - گزارش دقیق از بازه‌های زمانی کاری و مجموع ساعات ثبت شده.
- **⌨️ پالت دستورات سراسری (`Ctrl + K` / `Cmd + K`):**
  - جستجوی بلادرنگ در تمام تسک‌ها، عملکردهای پرکاربرد، دسته‌بندی‌ها، حالت‌های نمایش و تغییر تم.
- **💬 سیستم گفتگو و نظرات تسک‌ها:**
  - امکان ثبت کامنت‌های ساختاریافته به همراه زمان ثبت و پروفایل کاربر روی هر تسک.
- **🎨 طراحی لوکس، استاندارد و دو زبانه:**
  - رابط کاربری مینیمال با افکت‌های کنترل‌شده، تم دارک و لایت هوشمند، میکرو‌انیمیشن‌های روان و پشتیبانی کامل و اصولی از زبان‌های فارسی (RTL با فونت وزیرمتن) و انگلیسی.

---

## 🛠️ معماری و استک فنی

| بخش | تکنولوژی‌های استفاده‌شده |
|---|---|
| **فرانت‌اند** | React 19، Vite، Tailwind CSS، Lucide Icons، فونت وزیرمتن و Plus Jakarta Sans |
| **بک‌اند** | Node.js (ES Modules)، Express، Helmet، Rate Limiter، Cookie Parser |
| **پایگاه داده** | MongoDB همراه با Mongoose (کوئری‌های بهینه ایندکس‌شده، متدهای Lean) |
| **احراز هویت** | سشن‌های امن مبتنی بر توکن‌های JWT ذخیره در کوکی‌های `httpOnly` با سیستم رفرش توکن خودکار |
| **سرویس‌های خارجی** | API تلگرام (Telegram Bot API)، پردازشگر اختصاصی فرمت‌های مارک‌داون و CSV |

---

## 📁 ساختار پوشه‌های پروژه

```
taskera/
├── client/                     # برنامه فرانت‌اند (React + Vite)
│   ├── src/
│   │   ├── api/                # کلاینت ارتباطی Axios و ماژول‌های API
│   │   ├── components/         # کامپوننت‌های پایه رابط کاربری و پالت دستورات
│   │   ├── context/            # کانتکست‌های سراسری (Auth, Workspace, Theme, Lang)
│   │   ├── features/           # بخش‌های اصلی اپ (تسک‌ها، دسته‌ها، بات تلگرام)
│   │   ├── layouts/            # سایدبار، هدر بالا و فوتر
│   │   └── i18n/               # دیکشنری کامل دو زبانه (فارسی / انگلیسی)
│   └── public/                 # دارایی‌های وکتور و فاوآیکون اختصاصی
│
└── server/                     # وب‌سرویس و بک‌اند (Node.js + Express)
    ├── src/
    │   ├── config/             # تنظیمات دیتابیس و متغیرهای محیطی
    │   ├── controllers/        # کنترلرها و هندلرهای ریکوئست
    │   ├── middlewares/        # اعتبارسنجی احراز هویت، RBAC و محدودساز نرخ (Rate-limit)
    │   ├── models/             # اسکیمای Mongoose (کاربر، تسک، سازمان، عضویت)
    │   ├── routes/             # روت‌های ماژولار REST
    │   └── services/           # منطق اصلی بیزینس و سرویس اعلان تلگرام
```

---

## ⚡ راهنمای راه‌اندازی و اجرا

### ۱. پیش‌نیازها
- **Node.js**: نسخه ۱۸ به بالا
- **MongoDB**: نسخه لوکال یا رایگان MongoDB Atlas

### ۲. کلون کردن ریپازیتوری
```bash
git clone https://github.com/Parham-Codes/taskera.git
cd taskera
```

### ۳. راه‌اندازی بخش بک‌اند (سرور)
```bash
cd server
npm install
```

یک فایل به نام `.env` در پوشه `server/` بسازید و مقادیر زیر را در آن تنظیم کنید:
```env
PORT=7000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb_connection_string_شما
# کلیدهای JWT اجباری هستند و در صورت عدم تنظیم، برنامه متوقف می‌شود
JWT_ACCESS_SECRET=کلید_امنیتی_اکسس_توکن
JWT_REFRESH_SECRET=کلید_امنیتی_رفرش_توکن
TELEGRAM_BOT_TOKEN=توکن_اختیاری_پیشفرض_بات_تلگرام
```

سرور را اجرا کنید:
```bash
npm run dev
```

### ۴. راه‌اندازی بخش فرانت‌اند (کلاینت)
در یک ترمینال جداگانه:
```bash
cd client
npm install
npm run dev
```

برنامه در آدرس `http://localhost:5173` در دسترس شماست.

---

## 👤 سازنده و توسعه‌دهنده

طراحی و پیاده‌سازی توسط **پرهام تقی‌خانی (Parham Taghikhani)**

- **گیت‌هاب:** [@Parham-Codes](https://github.com/Parham-Codes)
- **وب‌سایت و پورتفولیو:** [parham-codes.github.io/portfolio](https://parham-codes.github.io/portfolio/)
- **ایمیل:** [parhamtaghikhani.31@gmail.com](mailto:parhamtaghikhani.31@gmail.com)

---

## 📄 لایسنس

این پروژه تحت لایسنس [MIT License](LICENSE) منتشر شده است.

---

<div align="center">

### ⭐ اگر این پروژه برای شما کاربردی یا الهام‌بخش بود، خوشحال می‌شم بهش در گیت‌هاب استار بدید!

</div>
