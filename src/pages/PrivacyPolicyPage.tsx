import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Moon,
  Shield,
  Lock,
  Eye,
  Trash2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import logo from "@/assets/logo.jpeg";

export default function PrivacyPolicyPage() {
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
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="mb-2 text-3xl font-bold text-foreground">
              {i18n.language === "ar" ? "سياسة الخصوصية" : "Privacy Policy"}
            </h1>
            <p className="text-muted-foreground">
              {i18n.language === "ar"
                ? "آخر تحديث: 4 فبراير 2026"
                : "Last Updated: February 4, 2026"}
            </p>
          </motion.div>

          {/* Quick Overview Cards */}
          <motion.div
            variants={fadeInUp}
            className="mb-8 grid gap-4 sm:grid-cols-3"
          >
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex items-center gap-3 p-4">
                <Lock className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-medium text-foreground">
                    {i18n.language === "ar"
                      ? "بياناتك محمية"
                      : "Your Data is Protected"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {i18n.language === "ar"
                      ? "تشفير AES-256"
                      : "AES-256 Encryption"}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex items-center gap-3 p-4">
                <Eye className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-medium text-foreground">
                    {i18n.language === "ar"
                      ? "الشفافية الكاملة"
                      : "Full Transparency"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {i18n.language === "ar"
                      ? "نوضح كيف نستخدم بياناتك"
                      : "We explain how we use your data"}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex items-center gap-3 p-4">
                <Trash2 className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-medium text-foreground">
                    {i18n.language === "ar" ? "تحكم كامل" : "Full Control"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {i18n.language === "ar"
                      ? "احذف بياناتك في أي وقت"
                      : "Delete your data anytime"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Policy Content */}
          <motion.div variants={fadeInUp}>
            <Card>
              <CardContent className="p-6 sm:p-8">
                <Section
                  title={
                    i18n.language === "ar" ? "١. مقدمة" : "1. Introduction"
                  }
                >
                  <p>
                    {i18n.language === "ar"
                      ? `مرحباً بك في Link-22 ("نحن" أو "لنا"). نحن ملتزمون بحماية خصوصيتك وضمان أمان معلوماتك الشخصية. توضح سياسة الخصوصية هذه كيفية جمع واستخدام والإفصاح عن معلوماتك وحمايتها عند استخدام تطبيقنا والخدمات ذات الصلة.`
                      : `Welcome to Link-22 ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and related services.`}
                  </p>
                  <p>
                    {i18n.language === "ar"
                      ? "Link-22 هي منصة سوق خدمات تربط العملاء بمقدمات الخدمات اللواتي يقدمن خدمات مثل الطبخ، التنظيف، العناية بالأظافر، تصفيف الشعر، رعاية الأطفال، وغيرها من الخدمات الشخصية."
                      : "Link-22 is a service marketplace platform that connects customers with service providers offering services such as cooking, cleaning, nail care, hair styling, childcare, and other personal services."}
                  </p>
                </Section>

                <Section
                  title={
                    i18n.language === "ar"
                      ? "٢. المعلومات التي نجمعها"
                      : "2. Information We Collect"
                  }
                >
                  <p className="font-medium text-foreground">
                    {i18n.language === "ar"
                      ? "المعلومات التي تقدمها:"
                      : "Information You Provide:"}
                  </p>
                  <BulletList
                    items={
                      i18n.language === "ar"
                        ? [
                            "معلومات الحساب: الاسم الكامل، البريد الإلكتروني، رقم الهاتف، وصورة الملف الشخصي",
                            "التحقق من الهوية: رقم الهوية الوطنية (لمقدمات الخدمات لضمان السلامة والثقة)",
                            "معلومات الموقع: عنوانك، المدينة، المنطقة، والموقع الجغرافي للمطابقة مع مقدمات الخدمات القريبات",
                            "معلومات الحجز: تفاصيل المواعيد، طلبات الخدمة، وتاريخ المعاملات",
                            "التقييمات والمراجعات: التعليقات والتقييمات التي تقدمها عن مقدمات الخدمات",
                          ]
                        : [
                            "Account Information: Full name, email address, phone number, and profile photo",
                            "Identity Verification: National ID number (for service providers to ensure safety and trust)",
                            "Location Data: Your address, city, region, and geographic location to match with nearby providers",
                            "Booking Information: Appointment details, service requests, and transaction history",
                            "Reviews and Ratings: Feedback and ratings you submit about service providers",
                          ]
                    }
                  />

                  <p className="mt-4 font-medium text-foreground">
                    {i18n.language === "ar"
                      ? "المعلومات المجمعة تلقائياً:"
                      : "Information Collected Automatically:"}
                  </p>
                  <BulletList
                    items={
                      i18n.language === "ar"
                        ? [
                            "معلومات الجهاز: نوع الجهاز، نظام التشغيل، ومعرفات الجهاز الفريدة",
                            "بيانات الاستخدام: الصفحات المعروضة، الميزات المستخدمة، وأنماط التفاعل",
                            "بيانات التحليلات: إحصائيات الاستخدام المجمعة لتحسين خدمتنا",
                          ]
                        : [
                            "Device Information: Device type, operating system, and unique device identifiers",
                            "Usage Data: Pages viewed, features used, and interaction patterns",
                            "Analytics Data: Aggregated usage statistics to improve our Service",
                          ]
                    }
                  />
                </Section>

                <Section
                  title={
                    i18n.language === "ar"
                      ? "٣. كيف نستخدم معلوماتك"
                      : "3. How We Use Your Information"
                  }
                >
                  <BulletList
                    items={
                      i18n.language === "ar"
                        ? [
                            "تقديم الخدمات: إنشاء وإدارة حسابك، تسهيل الحجوزات، وتمكين التواصل",
                            "مطابقة الموقع: ربط العملاء بمقدمات الخدمات القريبات وعرض معلومات المسافة",
                            "التحقق من الهوية: التحقق من هوية مقدمات الخدمات للحفاظ على سلامة المنصة",
                            "معالجة الدفع: معالجة المعاملات والمبالغ المستردة",
                            "التواصل: إرسال تأكيدات الحجز والتحديثات والتذكيرات",
                            "التحسين: تحليل أنماط الاستخدام وتحسين خدمتنا",
                          ]
                        : [
                            "Provide Services: Create and manage your account, facilitate bookings, and enable communication",
                            "Location Matching: Connect customers with nearby service providers and display distance information",
                            "Identity Verification: Verify service provider identity to maintain platform safety",
                            "Payment Processing: Process transactions and refunds",
                            "Communication: Send booking confirmations, updates, and reminders",
                            "Improvement: Analyze usage patterns and improve our Service",
                          ]
                    }
                  />
                </Section>

                <Section
                  title={
                    i18n.language === "ar"
                      ? "٤. بيانات الموقع"
                      : "4. Location Data"
                  }
                >
                  <p>
                    {i18n.language === "ar"
                      ? "بيانات الموقع ضرورية لعمل خدمتنا بشكل صحيح. نستخدم معلومات الموقع لمطابقة العملاء مع مقدمات الخدمات القريبات، وعرض معلومات المسافة، وتمكين البحث القائم على الموقع، وحساب رسوم التنقل."
                      : "Location data is essential for our Service to function properly. We use location information to match customers with nearby service providers, display distance information, enable location-based search, and calculate travel fees."}
                  </p>
                  <p>
                    {i18n.language === "ar"
                      ? "يمكنك التحكم في أذونات الموقع من خلال إعدادات جهازك. لا نتتبع موقعك باستمرار في الخلفية دون موافقتك الصريحة."
                      : "You can control location permissions through your device settings. We do not continuously track your location in the background without your explicit consent."}
                  </p>
                </Section>

                <Section
                  title={
                    i18n.language === "ar"
                      ? "٥. الهوية الوطنية والتحقق"
                      : "5. National ID and Verification"
                  }
                >
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <p className="font-medium text-foreground">
                      {i18n.language === "ar"
                        ? "نأخذ أمان وثائق الهوية على محمل الجد."
                        : "We take the security of identity documents extremely seriously."}
                    </p>
                  </div>
                  <p className="mt-4">
                    {i18n.language === "ar"
                      ? "تدابير الأمان لبيانات الهوية:"
                      : "Security Measures for ID Data:"}
                  </p>
                  <BulletList
                    items={
                      i18n.language === "ar"
                        ? [
                            "أرقام الهوية الوطنية مشفرة باستخدام تشفير AES-256",
                            "الوصول إلى بيانات الهوية مقيد بشكل صارم للموظفين المخولين فقط",
                            "وثائق الهوية مخزنة في قواعد بيانات آمنة ومعزولة",
                            "لا نشارك معلومات الهوية الوطنية مع أطراف ثالثة إلا بموجب القانون",
                          ]
                        : [
                            "National ID numbers are encrypted using AES-256 encryption",
                            "Access to ID data is strictly limited to authorized personnel only",
                            "ID documents are stored in secure, isolated databases",
                            "We do not share National ID information with third parties except as required by law",
                          ]
                    }
                  />
                </Section>

                <Section
                  title={
                    i18n.language === "ar"
                      ? "٦. تخزين البيانات وحمايتها"
                      : "6. Data Storage and Protection"
                  }
                >
                  <BulletList
                    items={
                      i18n.language === "ar"
                        ? [
                            "التشفير: البيانات مشفرة أثناء النقل (TLS/SSL) وأثناء التخزين (AES-256)",
                            "البنية التحتية الآمنة: نستخدم مزودي خدمات سحابية رائدين بشهادات أمان قوية",
                            "ضوابط الوصول: ضوابط وصول صارمة تحد من الوصول للموظفين المخولين فقط",
                            "المراقبة المستمرة: مراقبة الأنشطة المشبوهة والاختراقات المحتملة",
                          ]
                        : [
                            "Encryption: Data is encrypted in transit (TLS/SSL) and at rest (AES-256)",
                            "Secure Infrastructure: We use industry-leading cloud providers with security certifications",
                            "Access Controls: Strict access controls limit data access to authorized personnel only",
                            "Continuous Monitoring: Monitoring for suspicious activities and potential breaches",
                          ]
                    }
                  />
                </Section>

                <Section
                  title={
                    i18n.language === "ar"
                      ? "٧. المشاركة مع أطراف ثالثة"
                      : "7. Third-Party Sharing"
                  }
                >
                  <p>
                    {i18n.language === "ar"
                      ? "قد نشارك معلوماتك مع أطراف ثالثة في الحالات التالية:"
                      : "We may share your information with third parties in the following circumstances:"}
                  </p>
                  <BulletList
                    items={
                      i18n.language === "ar"
                        ? [
                            "معالجات الدفع: نستخدم خدمات دفع آمنة لمعالجة المعاملات",
                            "خدمات السحابة: نستخدم مزودي بنية تحتية سحابية لتخزين البيانات",
                            "المتطلبات القانونية: قد نفصح عن معلوماتك إذا طلب ذلك بموجب القانون",
                            "التحويلات التجارية: في حالة الاندماج أو الاستحواذ، قد يتم نقل معلوماتك",
                          ]
                        : [
                            "Payment Processors: We use secure payment services to process transactions",
                            "Cloud Services: We use cloud infrastructure providers for data storage",
                            "Legal Requirements: We may disclose your information if required by law",
                            "Business Transfers: In case of merger or acquisition, your information may be transferred",
                          ]
                    }
                  />
                </Section>

                <Section
                  title={
                    i18n.language === "ar"
                      ? "٨. حقوقك وخياراتك"
                      : "8. Your Rights and Choices"
                  }
                >
                  <BulletList
                    items={
                      i18n.language === "ar"
                        ? [
                            "الوصول: طلب نسخة من المعلومات الشخصية التي نحتفظ بها عنك",
                            "التصحيح: طلب تصحيح المعلومات غير الدقيقة أو غير المكتملة",
                            "الحذف: طلب حذف حسابك والبيانات الشخصية المرتبطة به",
                            "نقل البيانات: طلب بياناتك بتنسيق منظم وشائع الاستخدام",
                            "إلغاء الاشتراك: إلغاء الاشتراك في الاتصالات الترويجية في أي وقت",
                          ]
                        : [
                            "Access: Request a copy of the personal information we hold about you",
                            "Correction: Request correction of inaccurate or incomplete information",
                            "Deletion: Request deletion of your account and associated personal data",
                            "Data Portability: Request your data in a structured, commonly used format",
                            "Opt-Out: Opt out of promotional communications at any time",
                          ]
                    }
                  />
                </Section>

                <Section
                  title={
                    i18n.language === "ar"
                      ? "٩. الاحتفاظ بالبيانات"
                      : "9. Data Retention"
                  }
                >
                  <BulletList
                    items={
                      i18n.language === "ar"
                        ? [
                            "بيانات الحساب: يتم الاحتفاظ بها طوال فترة نشاط حسابك ولمدة تصل إلى 3 سنوات بعد الإغلاق",
                            "سجل الحجوزات: يتم الاحتفاظ به لمدة 5 سنوات للامتثال المالي والقانوني",
                            "التقييمات: يتم الاحتفاظ بها إلى أجل غير مسمى ما لم تطلب الحذف",
                            "بيانات التحقق من الهوية: يتم الاحتفاظ بها طوال فترة نشاط الحساب",
                          ]
                        : [
                            "Account Data: Retained while your account is active and for up to 3 years after closure",
                            "Booking History: Retained for 5 years for financial and legal compliance",
                            "Reviews: Retained indefinitely unless you request deletion",
                            "Identity Verification Data: Retained for the duration of account activity",
                          ]
                    }
                  />
                </Section>

                <Section
                  title={
                    i18n.language === "ar"
                      ? "١٠. خصوصية الأطفال"
                      : "10. Children's Privacy"
                  }
                >
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                    <p className="font-medium text-foreground">
                      {i18n.language === "ar"
                        ? "خدمتنا غير موجهة للأطفال دون سن 18 عاماً."
                        : "Our Service is not intended for children under the age of 18."}
                    </p>
                  </div>
                  <p className="mt-4">
                    {i18n.language === "ar"
                      ? "لا نجمع عمداً معلومات شخصية من الأطفال دون 18 عاماً. إذا كنت والداً أو وصياً وتعتقد أن طفلك قدم لنا معلومات شخصية، يرجى الاتصال بنا فوراً."
                      : "We do not knowingly collect personal information from children under 18. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately."}
                  </p>
                </Section>

                <Section
                  title={
                    i18n.language === "ar"
                      ? "١١. تحديثات هذه السياسة"
                      : "11. Updates to This Policy"
                  }
                >
                  <p>
                    {i18n.language === "ar"
                      ? "قد نقوم بتحديث سياسة الخصوصية هذه من وقت لآخر. عندما نجري تغييرات جوهرية، سنقوم بتحديث تاريخ 'آخر تحديث' وإخطارك من خلال التطبيق أو عبر البريد الإلكتروني."
                      : "We may update this Privacy Policy from time to time. When we make material changes, we will update the 'Last Updated' date and notify you through the app or via email."}
                  </p>
                </Section>

                <Section
                  title={
                    i18n.language === "ar" ? "١٢. اتصل بنا" : "12. Contact Us"
                  }
                >
                  <div className="rounded-lg bg-muted p-6">
                    <p className="mb-4">
                      {i18n.language === "ar"
                        ? "إذا كانت لديك أسئلة أو مخاوف بشأن سياسة الخصوصية هذه، يرجى الاتصال بنا:"
                        : "If you have questions or concerns regarding this Privacy Policy, please contact us:"}
                    </p>
                    <div className="space-y-2">
                      <p>
                        <strong>
                          {i18n.language === "ar"
                            ? "البريد الإلكتروني:"
                            : "Email:"}
                        </strong>{" "}
                        60azsazs@gmail.com
                      </p>
                      <p>
                        <strong>
                          {i18n.language === "ar"
                            ? "اسم التطبيق:"
                            : "App Name:"}
                        </strong>{" "}
                        Link-22
                      </p>
                      <p>
                        <strong>
                          {i18n.language === "ar" ? "العنوان:" : "Address:"}
                        </strong>{" "}
                        {i18n.language === "ar"
                          ? "المملكة العربية السعودية"
                          : "Saudi Arabia"}
                      </p>
                    </div>
                  </div>
                </Section>

                <Section
                  title={
                    i18n.language === "ar" ? "١٣. الامتثال" : "13. Compliance"
                  }
                >
                  <p>
                    {i18n.language === "ar"
                      ? "تم تصميم سياسة الخصوصية هذه للامتثال للقوانين واللوائح المعمول بها، بما في ذلك:"
                      : "This Privacy Policy is designed to comply with applicable laws and regulations, including:"}
                  </p>
                  <BulletList
                    items={
                      i18n.language === "ar"
                        ? [
                            "سياسات برنامج مطوري Google Play",
                            "إرشادات متجر تطبيقات Apple",
                            "نظام حماية البيانات الشخصية في المملكة العربية السعودية (PDPL)",
                          ]
                        : [
                            "Google Play Developer Program Policies",
                            "Apple App Store Guidelines",
                            "Saudi Arabia Personal Data Protection Law (PDPL)",
                          ]
                    }
                  />
                </Section>
              </CardContent>
            </Card>
          </motion.div>

          {/* Footer */}
          <motion.footer
            variants={fadeInUp}
            className="mt-8 text-center text-sm text-muted-foreground"
          >
            <p>
              © 2026 Link-22.{" "}
              {i18n.language === "ar"
                ? "جميع الحقوق محفوظة."
                : "All rights reserved."}
            </p>
          </motion.footer>
        </motion.div>
      </main>
    </div>
  );
}
