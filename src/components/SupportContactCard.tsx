import React from "react";
import { useTranslation } from "react-i18next";
import { Mail, Phone, MessageCircle, LifeBuoy, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSubscriptionSettings } from "@/hooks/queries/useSubscriptionSettings";

/**
 * Customer-support contact details, shown in both the client and the provider
 * profile. The values come from the settings the admin edits in the dashboard
 * (Contact Settings), so support numbers change without a redeploy.
 */
export const SupportContactCard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: settings } = useSubscriptionSettings();

  const email = settings?.contactEmail?.trim();
  const phone = settings?.contactPhone?.trim();
  const whatsapp = settings?.contactWhatsapp?.trim();

  const rows = [
    email && {
      key: "email",
      icon: <Mail className="h-5 w-5 text-muted-foreground" />,
      label: t("support.email"),
      value: email,
      href: `mailto:${email}`,
    },
    phone && {
      key: "phone",
      icon: <Phone className="h-5 w-5 text-muted-foreground" />,
      label: t("support.phone"),
      value: phone,
      href: `tel:${phone.replace(/\s+/g, "")}`,
    },
    whatsapp && {
      key: "whatsapp",
      icon: <MessageCircle className="h-5 w-5 text-green-600" />,
      label: t("support.whatsapp"),
      value: t("support.whatsappAction"),
      href: whatsapp,
      external: true,
    },
  ].filter(Boolean) as Array<{
    key: string;
    icon: React.ReactNode;
    label: string;
    value: string;
    href: string;
    external?: boolean;
  }>;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <LifeBuoy className="h-5 w-5 text-primary" />
          {t("support.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="px-6 pb-4 text-sm text-muted-foreground">
            {t("support.unavailable")}
          </p>
        ) : (
          rows.map((row) => (
            <a
              key={row.key}
              href={row.href}
              {...(row.external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="flex items-center justify-between border-b p-4 transition-colors last:border-b-0 hover:bg-accent/50"
            >
              <div className="flex items-center gap-3">
                {row.icon}
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">
                    {row.label}
                  </span>
                  <span dir="ltr" className="font-medium text-foreground">
                    {row.value}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground rtl:rotate-180" />
            </a>
          ))
        )}

        <button
          type="button"
          onClick={() => navigate("/help")}
          className="flex w-full items-center justify-between border-t p-4 text-start transition-colors hover:bg-accent/50"
        >
          <div className="flex items-center gap-3">
            <LifeBuoy className="h-5 w-5 text-muted-foreground" />
            <span>{t("support.helpCenter")}</span>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground rtl:rotate-180" />
        </button>
      </CardContent>
    </Card>
  );
};

export default SupportContactCard;
