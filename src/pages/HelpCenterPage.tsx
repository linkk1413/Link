import React from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const HelpCenterPage: React.FC = () => {
  const { t } = useTranslation();

  const sections = [
    "booking",
    "payments",
    "account",
    "deleteAccount",
    "privacy",
    "safety",
    "messaging",
    "reportContact",
  ] as const;
  const faqs = t("help.faqs", { returnObjects: true }) as Array<{
    q: string;
    a: string;
  }>;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container py-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold text-foreground">
              {t("help.title")}
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("help.subtitle")}
          </p>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {sections.map((sectionKey) => {
          const items = t(`help.sections.${sectionKey}.items`, {
            returnObjects: true,
          }) as string[];

          return (
            <motion.div
              key={sectionKey}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {t(`help.sections.${sectionKey}.title`)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc space-y-2 ps-5 text-sm text-muted-foreground">
                    {items.map((item, index) => (
                      <li
                        key={`${sectionKey}-${index}`}
                        dangerouslySetInnerHTML={{ __html: item }}
                      />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("help.faqTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={`faq-${index}`}>
                  <p className="text-sm font-semibold text-foreground">
                    {faq.q}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default HelpCenterPage;
