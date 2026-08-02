import { CommunicationPrefs } from "@/types";

// Providers who never touched the communication-preferences setting keep
// today's behavior: in-app chat only.
export const DEFAULT_COMMUNICATION_PREFS: CommunicationPrefs = {
  inAppChat: true,
  whatsapp: false,
  phoneCall: false,
};

// Saudi phone numbers are stored locally as "05XXXXXXXX" or "5XXXXXXXX"
// (see the signup form's validation regex). WhatsApp/tel: links need the
// international form without a leading zero.
const toInternationalSaudiPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("966") ? digits.slice(3) : digits.replace(/^0/, "");
  return `966${local}`;
};

export const getWhatsappLink = (phone: string): string =>
  `https://wa.me/${toInternationalSaudiPhone(phone)}`;

export const getTelLink = (phone: string): string =>
  `tel:+${toInternationalSaudiPhone(phone)}`;
