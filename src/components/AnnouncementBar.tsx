import React from "react";

interface AnnouncementBarProps {
  text?: string;
  backgroundColor?: string;
  textColor?: string;
}

// Independent strip shown directly above the promo banner — renders nothing
// when there's no text, so an empty admin field means no strip at all.
export const AnnouncementBar: React.FC<AnnouncementBarProps> = ({
  text,
  backgroundColor,
  textColor,
}) => {
  if (!text) return null;

  return (
    <div
      dir="auto"
      className="mb-2 rounded-xl px-4 py-2 text-center text-sm font-medium"
      style={{
        backgroundColor: backgroundColor || "#B5697D",
        color: textColor || "#ffffff",
      }}
    >
      {text}
    </div>
  );
};

export default AnnouncementBar;
