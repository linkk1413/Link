import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Moon,
  FileText,
  Users,
  CreditCard,
  Shield,
  AlertTriangle,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import logo from "@/assets/logo.jpeg";

export default function TermsOfServicePage() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const isRTL = i18n.dir() === "rtl";

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const Section = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <motion.section variants={fadeInUp} className="mb-8">
      <h2 className="mb-4 text-xl font-semibold text-foreground">{title}</h2>
      <div className="space-y-4 text-muted-foreground">{children}</div>
    </motion.section>
  );

  const BulletList = ({ items }: { items: string[] }) => (
    <ul className="list-disc space-y-2 ps-6">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );

  // Arabic content
  const arContent = {
    title: "شروط الخدمة",
    lastUpdated: "آخر تحديث: 19 فبراير 2026",
    intro: `مرحباً بك في تطبيق لينك-22. باستخدامك لهذا التطبيق، فإنك توافق على الالتزام بهذه الشروط والأحكام. يرجى قراءتها بعناية قبل استخدام خدماتنا.`,
    sections: [
      {
        title: "1. تعريف الخدمة",
        content: `لينك-22 هو تطبيق إلكتروني يربط بين مقدمات الخدمات (المزودات) والعملاء في المملكة العربية السعودية. نحن نوفر منصة للتواصل والحجز فقط، ولسنا طرفاً في العلاقة التعاقدية بين العميلة ومقدمة الخدمة.`,
        bullets: [
          "نحن منصة وسيطة وليس مقدم خدمات مباشر",
          "جميع الخدمات المعروضة تقدم من قبل مزودات مستقلات",
          "نحن لا نتحمل مسؤولية جودة الخدمات المقدمة",
        ],
      },
      {
        title: "2. شروط الاستخدام للعملاء",
        content: "عند استخدامك كعميلة، فإنك توافقين على:",
        bullets: [
          "تقديم معلومات صحيحة ودقيقة عند التسجيل",
          "الالتزام بمواعيد الحجوزات المتفق عليها",
          "إلغاء الحجز قبل 24 ساعة على الأقل لاسترداد المبلغ",
          "التعامل باحترام مع مقدمات الخدمات",
          "الدفع في الوقت المحدد وبالطريقة المتفق عليها",
          "عدم استخدام التطبيق لأغراض غير قانونية",
        ],
      },
      {
        title: "3. شروط الاستخدام لمقدمات الخدمات",
        content: "عند تسجيلك كمزودة خدمة، فإنك توافقين على:",
        bullets: [
          "تقديم معلومات صحيحة عن نفسك وخدماتك",
          "الحصول على التراخيص اللازمة لممارسة نشاطك",
          "الالتزام بالمواعيد والأسعار المعلنة",
          "تقديم خدمات ذات جودة عالية",
          "دفع رسوم الاشتراك في الوقت المحدد",
          "الالتزام بسياسات المنصة وإرشاداتها",
        ],
      },
      {
        title: "4. الأسعار والدفع",
        content: "تحدد مقدمات الخدمات أسعارهن بشكل مستقل. نظام الدفع:",
        bullets: [
          "تبدأ أسعار الخدمات من 50 ريال سعودي",
          "يتم الدفع من خلال بوابة موثوقة وآمنة",
          "رسوم الاشتراك الشهري لمقدمات الخدمات: 10 ريال سعودي",
          "رسوم الاشتراك نصف السنوي: 50 ريال سعودي",
          "رسوم الاشتراك السنوي: 96 ريال سعودي",
          "لا نتقاضى عمولة على الحجوزات - مقدمات الخدمات يحصلن على 100% من المبلغ",
        ],
      },
      {
        title: "5. سياسة الإلغاء والاسترداد",
        content: "سياسة الإلغاء الخاصة بنا:",
        bullets: [
          "إلغاء قبل 24 ساعة: استرداد كامل المبلغ",
          "إلغاء قبل 12 ساعة: استرداد 50% من المبلغ",
          "إلغاء قبل أقل من 12 ساعة: لا يوجد استرداد",
          "في حالة إلغاء مقدمة الخدمة: استرداد كامل للعميلة",
          "النزاعات تحل من خلال إدارة المنصة",
        ],
      },
      {
        title: "6. المحتوى والملكية الفكرية",
        content: "حقوق الملكية الفكرية:",
        bullets: [
          "جميع حقوق التطبيق والشعار محفوظة لـ لينك-22",
          "مقدمات الخدمات تمتلك حقوق محتواهن وصورهن",
          "يمنع نسخ أو إعادة استخدام أي محتوى بدون إذن",
          "التقييمات والمراجعات تصبح ملكاً للمنصة",
        ],
      },
      {
        title: "7. سياسة المحتوى الذي ينشئه المستخدم",
        content:
          "تلتزم لينك-22 بتوفير بيئة آمنة ومحترمة لجميع المستخدمين. ينطبق ما يلي على جميع المحتويات التي ينشئها المستخدمون بما في ذلك التقييمات والرسائل والصور والملفات الشخصية:",
        bullets: [
          "نتبع سياسة عدم تسامح مطلق مع المحتوى المسيء أو غير اللائق",
          "يُحظر نشر محتوى يحض على الكراهية أو التمييز أو العنف أو التحرش أو أي مواد غير قانونية",
          "يُحظر نشر محتوى جنسي صريح أو إباحي",
          "يمكن للمستخدمين الإبلاغ عن أي محتوى مسيء مباشرة من التطبيق",
          "يتم فحص جميع البلاغات خلال 24 ساعة واتخاذ الإجراء المناسب",
          "يحق للمنصة إزالة أي محتوى ينتهك هذه السياسة دون إشعار مسبق",
          "يحق للمنصة تعليق أو إنهاء حساب أي مستخدم ينشر محتوى مسيء",
          "يمكن للمستخدمين حذف المحتوى الخاص بهم في أي وقت",
          "يمكن للمستخدمين حظر المستخدمين المسيئين لمنعهم من التواصل معهم",
          "للإبلاغ عن محتوى مسيء، يرجى التواصل عبر: 60azsazs@gmail.com",
        ],
      },
      {
        title: "8. حدود المسؤولية",
        content: "إخلاء المسؤولية:",
        bullets: [
          "نحن منصة وسيطة ولا نضمن جودة الخدمات",
          "لا نتحمل مسؤولية أي أضرار ناتجة عن الخدمات",
          "لا نتحمل مسؤولية انقطاع الخدمة لأسباب تقنية",
          "المستخدمات مسؤولات عن التحقق من مؤهلات مقدمات الخدمات",
        ],
      },
      {
        title: "9. إنهاء الحساب",
        content: "يحق لنا إنهاء أو تعليق حسابك في الحالات التالية:",
        bullets: [
          "انتهاك شروط الخدمة",
          "تقديم معلومات كاذبة",
          "سلوك غير لائق أو مسيء",
          "عدم سداد المستحقات المالية",
          "أي نشاط يضر بالمنصة أو مستخدميها",
        ],
      },
      {
        title: "10. القانون الساري",
        content:
          "تخضع هذه الشروط لأنظمة المملكة العربية السعودية. أي نزاعات تحل عبر الجهات المختصة في المملكة العربية السعودية.",
        bullets: [],
      },
      {
        title: "11. التواصل معنا",
        content: "للاستفسارات حول شروط الخدمة:",
        bullets: [
          "البريد الإلكتروني: 60azsazs@gmail.com",
          "الدعم الفني: متوفر داخل التطبيق",
        ],
      },
    ],
  };

  // English content
  const enContent = {
    title: "Terms of Service",
    lastUpdated: "Last Updated: February 19, 2026",
    intro: `Welcome to Link-22. By using this application, you agree to be bound by these terms and conditions. Please read them carefully before using our services.`,
    sections: [
      {
        title: "1. Service Definition",
        content: `Link-22 is a mobile application that connects service providers with clients in Saudi Arabia. We provide a platform for communication and booking only, and we are not a party to the contractual relationship between the client and the service provider.`,
        bullets: [
          "We are an intermediary platform, not a direct service provider",
          "All services listed are provided by independent providers",
          "We are not responsible for the quality of services provided",
        ],
      },
      {
        title: "2. Terms of Use for Clients",
        content: "By using our platform as a client, you agree to:",
        bullets: [
          "Provide accurate and truthful information during registration",
          "Honor your booking appointments",
          "Cancel bookings at least 24 hours in advance for a full refund",
          "Treat service providers with respect",
          "Pay on time and through agreed payment methods",
          "Not use the app for illegal purposes",
        ],
      },
      {
        title: "3. Terms of Use for Service Providers",
        content: "By registering as a service provider, you agree to:",
        bullets: [
          "Provide accurate information about yourself and your services",
          "Obtain necessary licenses to practice your profession",
          "Honor your advertised schedules and prices",
          "Deliver high-quality services",
          "Pay subscription fees on time",
          "Comply with platform policies and guidelines",
        ],
      },
      {
        title: "4. Pricing and Payment",
        content:
          "Service providers set their own prices independently. Our payment system:",
        bullets: [
          "Service prices start from 50 SAR",
          "Payments are processed through secure, trusted payment gateways",
          "Monthly subscription fee for providers: 10 SAR",
          "Semi-annual subscription: 50 SAR",
          "Annual subscription: 96 SAR",
          "We charge no commission on bookings - providers receive 100% of the service fee",
        ],
      },
      {
        title: "5. Cancellation and Refund Policy",
        content: "Our cancellation policy:",
        bullets: [
          "Cancellation 24+ hours before: Full refund",
          "Cancellation 12-24 hours before: 50% refund",
          "Cancellation less than 12 hours before: No refund",
          "If provider cancels: Full refund to client",
          "Disputes are resolved through platform administration",
        ],
      },
      {
        title: "6. Content and Intellectual Property",
        content: "Intellectual property rights:",
        bullets: [
          "All app rights and logos are reserved by Link-22",
          "Service providers own the rights to their content and photos",
          "Copying or reusing any content without permission is prohibited",
          "Reviews and ratings become property of the platform",
        ],
      },
      {
        title: "7. User Generated Content Policy",
        content:
          "Link-22 is committed to providing a safe and respectful environment for all users. The following applies to all user-generated content including reviews, messages, photos, and profiles:",
        bullets: [
          "We maintain a zero-tolerance policy for objectionable or abusive content",
          "Content that promotes hate, discrimination, violence, harassment, or any illegal material is strictly prohibited",
          "Sexually explicit or pornographic content is strictly prohibited",
          "Users can report objectionable content directly within the app",
          "All reports are reviewed within 24 hours and appropriate action is taken",
          "The platform reserves the right to remove any content that violates this policy without prior notice",
          "The platform reserves the right to suspend or terminate the account of any user who posts objectionable content",
          "Users can delete their own content at any time",
          "Users can block abusive users to prevent further contact",
          "To report objectionable content, please contact: 60azsazs@gmail.com",
        ],
      },
      {
        title: "8. Limitation of Liability",
        content: "Disclaimer:",
        bullets: [
          "We are an intermediary platform and do not guarantee service quality",
          "We are not liable for any damages resulting from services",
          "We are not responsible for service interruptions due to technical issues",
          "Users are responsible for verifying provider qualifications",
        ],
      },
      {
        title: "9. Account Termination",
        content:
          "We reserve the right to terminate or suspend your account in the following cases:",
        bullets: [
          "Violation of terms of service",
          "Providing false information",
          "Inappropriate or abusive behavior",
          "Failure to pay outstanding fees",
          "Any activity that harms the platform or its users",
        ],
      },
      {
        title: "10. Governing Law",
        content:
          "These terms are governed by the laws of the Kingdom of Saudi Arabia. Any disputes shall be resolved through the competent authorities in Saudi Arabia.",
        bullets: [],
      },
      {
        title: "11. Contact Us",
        content: "For inquiries about these terms of service:",
        bullets: [
          "Email: 60azsazs@gmail.com",
          "Technical Support: Available within the app",
        ],
      },
    ],
  };

  const content = i18n.language === "ar" ? arContent : enContent;

  const highlights = [
    {
      icon: <Users className="h-6 w-6" />,
      titleAr: "منصة وسيطة",
      titleEn: "Intermediary Platform",
      descAr: "نربط بين العملاء ومقدمات الخدمات",
      descEn: "We connect clients with service providers",
    },
    {
      icon: <CreditCard className="h-6 w-6" />,
      titleAr: "دفع آمن",
      titleEn: "Secure Payment",
      descAr: "بوابة دفع موثوقة ومحمية",
      descEn: "Trusted and protected payment gateway",
    },
    {
      icon: <Shield className="h-6 w-6" />,
      titleAr: "حماية المستخدم",
      titleEn: "User Protection",
      descAr: "سياسات واضحة للإلغاء والاسترداد",
      descEn: "Clear cancellation and refund policies",
    },
    {
      icon: <Scale className="h-6 w-6" />,
      titleAr: "القانون السعودي",
      titleEn: "Saudi Law",
      descAr: "تخضع للأنظمة السعودية",
      descEn: "Governed by Saudi regulations",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="container flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-2">
            <img
              src={logo}
              alt="Link-22"
              className="h-10 w-10 rounded-lg object-cover"
            />
            <span className="text-xl font-bold text-foreground">Link-22</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <div className="flex items-center gap-2 rounded-full border border-border px-2 py-1">
              <Moon className="h-4 w-4 text-muted-foreground" />
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(checked) =>
                  setTheme(checked ? "dark" : "light")
                }
              />
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container pb-20 pt-24">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.05 } },
          }}
        >
          {/* Header Section */}
          <motion.div variants={fadeInUp} className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h1 className="mb-2 text-3xl font-bold text-foreground">
              {content.title}
            </h1>
            <p className="text-muted-foreground">{content.lastUpdated}</p>
          </motion.div>

          {/* Quick Highlights */}
          <motion.div
            variants={fadeInUp}
            className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {highlights.map((item, index) => (
              <Card key={index} className="text-center">
                <CardContent className="pt-6">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {item.icon}
                  </div>
                  <h3 className="mb-1 font-semibold">
                    {i18n.language === "ar" ? item.titleAr : item.titleEn}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {i18n.language === "ar" ? item.descAr : item.descEn}
                  </p>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* Introduction */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <motion.p
                variants={fadeInUp}
                className="text-lg leading-relaxed text-muted-foreground"
              >
                {content.intro}
              </motion.p>
            </CardContent>
          </Card>

          {/* Main Content */}
          <Card>
            <CardContent className="pt-6">
              {content.sections.map((section, index) => (
                <Section key={index} title={section.title}>
                  <p>{section.content}</p>
                  {section.bullets.length > 0 && (
                    <BulletList items={section.bullets} />
                  )}
                </Section>
              ))}
            </CardContent>
          </Card>

          {/* Back Link */}
          <motion.div variants={fadeInUp} className="mt-8 text-center">
            <Link to="/">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                {i18n.language === "ar"
                  ? "العودة للصفحة الرئيسية"
                  : "Back to Home"}
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container text-center">
          <div className="mb-4 flex justify-center gap-6">
            <Link
              to="/privacy"
              className="text-muted-foreground hover:text-foreground"
            >
              {i18n.language === "ar" ? "سياسة الخصوصية" : "Privacy Policy"}
            </Link>
            <Link
              to="/terms"
              className="text-muted-foreground hover:text-foreground"
            >
              {i18n.language === "ar" ? "شروط الخدمة" : "Terms of Service"}
            </Link>
          </div>
          <p className="text-muted-foreground">
            © 2026 Link-22.{" "}
            {i18n.language === "ar"
              ? "جميع الحقوق محفوظة."
              : "All rights reserved."}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {i18n.language === "ar"
              ? "المملكة العربية السعودية"
              : "Kingdom of Saudi Arabia"}
          </p>
        </div>
      </footer>
    </div>
  );
}
