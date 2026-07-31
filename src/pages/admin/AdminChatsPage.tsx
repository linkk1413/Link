import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Search,
  MessageSquare,
  Trash2,
  Ban,
  AlertTriangle,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAllChats, useChatMessages, useDeleteMessage } from "@/hooks/queries/useChats";
import { useUpdateUserStatus } from "@/hooks/queries/useUsers";
import { Chat, Message } from "@/types";
import { toast } from "sonner";

const AdminChatsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<{
    uid: string;
    label: string;
  } | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);

  const { data: chats = [], isLoading } = useAllChats();
  const { data: messages = [], isLoading: loadingMessages } = useChatMessages(
    selectedChat?.id || "",
  );
  const deleteMessageMutation = useDeleteMessage();
  const suspendMutation = useUpdateUserStatus();

  const filteredChats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter(
      (chat) =>
        chat.clientName?.toLowerCase().includes(q) ||
        chat.providerName?.toLowerCase().includes(q) ||
        chat.bookingId?.toLowerCase().includes(q),
    );
  }, [chats, searchQuery]);

  const flaggedCount = (chat: Chat) =>
    chat.id === selectedChat?.id
      ? messages.filter((m) => m.flaggedContactInfo).length
      : 0;

  const formatDateTime = (date: Date) =>
    new Date(date).toLocaleString(isArabic ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleDeleteMessage = async () => {
    if (!selectedChat || !messageToDelete) return;
    try {
      await deleteMessageMutation.mutateAsync({
        chatId: selectedChat.id,
        messageId: messageToDelete.id,
      });
      toast.success(t("admin.messageDeleted"));
      setMessageToDelete(null);
    } catch (error) {
      console.error("Failed to delete message:", error);
      toast.error(t("common.error"));
    }
  };

  const confirmSuspend = async () => {
    if (!suspendTarget) return;
    try {
      await suspendMutation.mutateAsync({
        userId: suspendTarget.uid,
        status: "SUSPENDED",
      });
      toast.success(t("admin.accountSuspendedShort"));
      setSuspendTarget(null);
    } catch (error) {
      console.error("Failed to suspend account:", error);
      toast.error(t("common.error"));
    }
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-background">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
      >
        <motion.div variants={fadeInUp} className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            {t("admin.chatsManagement")}
          </h1>
          <p className="text-muted-foreground">{t("admin.chatsDescription")}</p>
        </motion.div>

        <motion.div variants={fadeInUp} className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("admin.searchChats")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10"
            />
          </div>
        </motion.div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredChats.length === 0 ? (
          <motion.div
            variants={fadeInUp}
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-12 text-center"
          >
            <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{t("admin.noChats")}</p>
          </motion.div>
        ) : (
          <motion.div variants={fadeInUp} className="space-y-3">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                className="flex cursor-pointer items-center justify-between rounded-xl bg-card p-4 transition-colors hover:bg-card/80"
                role="button"
                tabIndex={0}
                onClick={() => setSelectedChat(chat)}
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      <MessageSquare className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {chat.clientName || t("admin.notProvided")}
                      {" ↔ "}
                      {chat.providerName || t("admin.notProvided")}
                    </h3>
                    <p className="line-clamp-1 text-sm text-muted-foreground">
                      {chat.lastMessage || t("admin.noMessagesYet")}
                    </p>
                    {chat.bookingId && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("admin.orderRef")}: {chat.bookingId}
                      </p>
                    )}
                  </div>
                </div>
                {chat.lastMessageAt && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(chat.lastMessageAt)}
                  </span>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Chat Thread Dialog */}
      <Dialog
        open={!!selectedChat}
        onOpenChange={(open) => !open && setSelectedChat(null)}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {selectedChat?.clientName} ↔ {selectedChat?.providerName}
            </DialogTitle>
            <DialogDescription>
              {selectedChat?.bookingId
                ? `${t("admin.orderRef")}: ${selectedChat.bookingId}`
                : t("admin.noOrderLinked")}
              {flaggedCount(selectedChat as Chat) > 0 && (
                <span className="ms-2 inline-flex items-center gap-1 text-amber-600">
                  <AlertTriangle className="h-3 w-3" />
                  {t("admin.flaggedMessagesCount", {
                    count: flaggedCount(selectedChat as Chat),
                  })}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2 border-b border-border pb-3">
            <Button
              variant="outline"
              size="sm"
              className="text-destructive"
              onClick={() =>
                selectedChat &&
                setSuspendTarget({
                  uid: selectedChat.clientId,
                  label: selectedChat.clientName || t("roles.client"),
                })
              }
            >
              <Ban className="me-1 h-4 w-4" />
              {t("admin.suspendClient")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive"
              onClick={() =>
                selectedChat &&
                setSuspendTarget({
                  uid: selectedChat.providerId,
                  label: selectedChat.providerName || t("roles.provider"),
                })
              }
            >
              <Ban className="me-1 h-4 w-4" />
              {t("admin.suspendProvider")}
            </Button>
          </div>

          <ScrollArea className="flex-1 pe-2">
            {loadingMessages ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : messages.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                {t("admin.noMessagesYet")}
              </p>
            ) : (
              <div className="space-y-2 py-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start justify-between gap-2 rounded-lg p-3 ${
                      message.flaggedContactInfo
                        ? "bg-amber-50 dark:bg-amber-900/20"
                        : "bg-muted/50"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        {message.senderId === selectedChat?.clientId
                          ? selectedChat?.clientName || t("roles.client")
                          : selectedChat?.providerName || t("roles.provider")}
                        <span>•</span>
                        {formatDateTime(message.createdAt)}
                        {message.flaggedContactInfo && (
                          <span className="flex items-center gap-1 text-amber-700 dark:text-amber-300">
                            <AlertTriangle className="h-3 w-3" />
                            {t("admin.flaggedContactInfo")}
                          </span>
                        )}
                      </div>
                      {message.type === "IMAGE" ? (
                        <img
                          src={message.imageUrl}
                          alt="attachment"
                          className="mt-1 h-24 w-24 rounded-lg object-cover"
                        />
                      ) : (
                        <p className="mt-1 break-words text-sm text-foreground">
                          {message.text}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => setMessageToDelete(message)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedChat(null)}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Message Confirmation */}
      <Dialog
        open={!!messageToDelete}
        onOpenChange={(open) => !open && setMessageToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.deleteMessageTitle")}</DialogTitle>
            <DialogDescription>
              {t("admin.deleteMessageWarning")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setMessageToDelete(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteMessage}
              disabled={deleteMessageMutation.isPending}
            >
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Account Confirmation */}
      <Dialog
        open={!!suspendTarget}
        onOpenChange={(open) => !open && setSuspendTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.suspendTitle")}</DialogTitle>
            <DialogDescription>
              {t("admin.suspendDescription", { name: suspendTarget?.label })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSuspendTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmSuspend}
              disabled={suspendMutation.isPending}
            >
              {t("admin.suspend")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminChatsPage;
