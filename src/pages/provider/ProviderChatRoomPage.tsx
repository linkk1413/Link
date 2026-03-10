import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Flag, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import {
  useChat,
  useChatMessages,
  useSendMessage,
} from "@/hooks/queries/useChats";
import { useClientName } from "@/hooks/queries/useUsers";
import { Message } from "@/types";
import { isContentClean } from "@/lib/contentFilter";
import { toast } from "sonner";
import { ReportDialog } from "@/components/ReportDialog";
import {
  useBlockUser,
  useUnblockUser,
  useIsUserBlocked,
} from "@/hooks/queries/useBlocks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

const ProviderChatRoomPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isArabic = i18n.language === "ar";

  const [messageText, setMessageText] = useState("");
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch data
  const { data: chat, isLoading: loadingChat } = useChat(chatId || "");
  const { data: fetchedClientName, isLoading: loadingClient } = useClientName(
    chat?.clientId || "",
  );
  const { data: messages = [], isLoading: loadingMessages } = useChatMessages(
    chatId || "",
  );
  const sendMessageMutation = useSendMessage();

  // Block hooks
  const blockUserMutation = useBlockUser();
  const unblockUserMutation = useUnblockUser();
  const { data: isBlocked } = useIsUserBlocked(
    user?.uid || "",
    chat?.clientId || "",
  );

  // Get client name with fallbacks
  const clientName =
    chat?.clientName ||
    fetchedClientName ||
    (loadingClient ? "..." : t("chat.client"));

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleBlock = async () => {
    if (!user || !chat?.clientId) return;
    try {
      if (isBlocked) {
        await unblockUserMutation.mutateAsync({
          blockerId: user.uid,
          blockedUserId: chat.clientId,
        });
        toast.success(t("block.unblocked"));
      } else {
        await blockUserMutation.mutateAsync({
          blockerId: user.uid,
          blockedUserId: chat.clientId,
        });
        toast.success(t("block.blocked"));
      }
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !chatId || !user) return;

    // Content filter check
    if (!isContentClean(messageText)) {
      toast.error(t("contentFilter.blocked"));
      return;
    }

    try {
      await sendMessageMutation.mutateAsync({
        chatId,
        senderId: user.uid,
        text: messageText.trim(),
      });
      setMessageText("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString(isArabic ? "ar-SA" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateDivider = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffDays = Math.floor(
      (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) {
      return t("chat.today");
    } else if (diffDays === 1) {
      return t("chat.yesterday");
    } else {
      return messageDate.toLocaleDateString(isArabic ? "ar-SA" : "en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce(
    (groups, message) => {
      const date = new Date(message.createdAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
      return groups;
    },
    {} as Record<string, Message[]>,
  );

  if (loadingChat || loadingClient) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="border-b border-border bg-card p-4">
          <Skeleton className="h-8 w-48" />
        </header>
        <div className="flex-1 p-4">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-3/4" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <p className="text-muted-foreground">{t("chat.notFound")}</p>
        <Button variant="outline" onClick={handleBack} className="mt-4">
          {t("common.back")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg">
              👩
            </div>
            <div>
              <h1 className="font-semibold text-foreground">
                {clientName || t("chat.client")}
              </h1>
            </div>
          </div>

          <div className="ms-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setReportDialogOpen(true)}
                  className="text-destructive"
                >
                  <Flag className="h-4 w-4 me-2" />
                  {t("report.reportUser")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBlock}>
                  <Ban className="h-4 w-4 me-2" />
                  {isBlocked ? t("block.unblock") : t("block.block")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        {loadingMessages ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
              >
                <Skeleton className="h-16 w-3/4 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-muted-foreground">{t("chat.noMessages")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("chat.startConversation")}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date}>
                {/* Date Divider */}
                <div className="mb-4 flex items-center justify-center">
                  <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                    {formatDateDivider(new Date(date))}
                  </span>
                </div>

                {/* Messages */}
                <div className="space-y-3">
                  {dateMessages.map((message) => {
                    const isOwn = message.senderId === user?.uid;
                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                            isOwn
                              ? "bg-gradient-to-br from-primary to-primary/90 text-white"
                              : "bg-white border border-border/50"
                          }`}
                        >
                          <p
                            className={`text-sm ${isOwn ? "text-white" : "text-foreground"}`}
                          >
                            {message.text}
                          </p>
                          <p
                            className={`mt-1 text-end text-[10px] ${
                              isOwn ? "text-white/70" : "text-muted-foreground"
                            }`}
                          >
                            {formatTime(message.createdAt)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Message Input */}
      <div className="fixed bottom-20 left-0 right-0 border-t border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t("chat.typeMessage")}
            className="flex-1 rounded-full"
          />

          <Button
            size="icon"
            className="shrink-0 rounded-full"
            onClick={handleSendMessage}
            disabled={!messageText.trim() || sendMessageMutation.isPending}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Report Dialog */}
      {user && chat && (
        <ReportDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          targetType="USER"
          targetId={chat.clientId}
          reporterId={user.uid}
          reporterName={user.name || user.displayName}
          targetOwnerId={chat.clientId}
          targetOwnerName={clientName}
        />
      )}
    </div>
  );
};

export default ProviderChatRoomPage;
