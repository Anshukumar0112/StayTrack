/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BackButton from "@/components/ui/BackButton";
import { MessageCircleIcon, Building2Icon, UserIcon } from "@/components/ui/Icons";
import { getMyConversations, getMessages, sendMessage, markConversationAsRead } from "@/lib/api";
import { Conversation, Message, getConversationId, formatTimestamp, getMessageText, getMessageId } from "@/types/booking";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export default function HostMessagesPage() {
  const { firebaseUser, loading: authLoading, handleProtectedAction } = useAuthGuard();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendLoading, setSendLoading] = useState(false);

  const fetchConvos = async () => {
    setLoading(true);
    try {
      const data = await getMyConversations();
      if (data && Array.isArray(data)) {
        setConversations(data);
        if (data.length > 0 && !activeConvoId) {
          setActiveConvoId(getConversationId(data[0]));
        }
      } else {
        setConversations([]);
      }
    } catch (err) {
      console.warn("Could not fetch conversations:", err);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      handleProtectedAction("/host/messages", "host");
    } else if (firebaseUser) {
      fetchConvos();
    }
  }, [firebaseUser, authLoading]);

  useEffect(() => {
    if (!activeConvoId) return;
    getMessages(activeConvoId)
      .then((msgs) => {
        if (msgs && Array.isArray(msgs)) setMessages(msgs);
        else setMessages([]);
      })
      .catch((err) => console.warn("Could not fetch messages:", err));

    markConversationAsRead(activeConvoId).catch(() => {});
  }, [activeConvoId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConvoId) return;

    setSendLoading(true);
    const textToSend = messageText;
    setMessageText("");

    try {
      const newMsg = await sendMessage(activeConvoId, textToSend);
      if (newMsg) {
        setMessages((prev) => [...prev, newMsg]);
      }
      fetchConvos();
    } catch (err: any) {
      alert("Failed to send message: " + (err.message || "Please try again"));
    } finally {
      setSendLoading(false);
    }
  };

  const activeConvo = conversations.find((c) => getConversationId(c) === activeConvoId);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <BackButton
          fallbackUrl="/host"
          label="Back to Dashboard"
          className="text-xs font-semibold mb-2"
        />
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">Host Messages</h1>
        <p className="text-xs text-muted font-medium mt-1">
          Coordinate guest arrivals, key handover, and answer property inquiries
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center shadow-subtle">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sm font-semibold text-muted">Loading guest conversations...</p>
        </div>
      ) : conversations.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-surface p-8 shadow-subtle">
          <div className="w-12 h-12 rounded-2xl bg-surface-muted border border-border flex items-center justify-center mx-auto mb-3">
            <MessageCircleIcon className="w-6 h-6 text-muted" />
          </div>
          <h3 className="text-base font-bold text-foreground">No Guest Inquiries Yet</h3>
          <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
            When guests message you from your property listings or booking requests, their conversations will appear here.
          </p>
          <Link
            href="/host/properties"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-white px-5 py-2.5 text-xs font-bold transition-all shadow-subtle"
          >
            <span>View My Properties</span>
          </Link>
        </div>
      ) : (
        <div className="min-h-[560px] rounded-2xl border border-border overflow-hidden flex flex-col md:flex-row shadow-subtle bg-surface">
          {/* Left Conversations Sidebar */}
          <div
            className={`w-full md:w-80 border-r border-border bg-surface p-4 space-y-2 shrink-0 ${
              activeConvoId ? "hidden md:block" : "block"
            }`}
          >
            <div className="flex items-center justify-between px-2 mb-3">
              <h3 className="text-xs font-bold text-muted uppercase tracking-wider">Inquiries ({conversations.length})</h3>
            </div>
            <div className="space-y-1.5 overflow-y-auto max-h-[500px]">
              {conversations.map((c) => {
                const convoId = getConversationId(c);
                const isActive = activeConvoId === convoId;

                return (
                  <button
                    key={convoId}
                    type="button"
                    onClick={() => setActiveConvoId(convoId)}
                    className={`w-full text-left p-3 rounded-xl cursor-pointer transition-all border ${
                      isActive
                        ? "bg-primary-light/40 text-primary-dark border-primary/30 font-bold shadow-2xs"
                        : "border-transparent hover:bg-surface-muted text-foreground"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <h4 className="text-xs font-bold truncate flex-1">{c.propertyTitle || `Guest Inquiry #${convoId.slice(0, 6)}`}</h4>
                      <span className={`text-[10px] shrink-0 ${isActive ? "text-primary font-bold" : "text-muted"}`}>
                        {formatTimestamp(c.lastMessageTimestamp || c.lastMessageAt)}
                      </span>
                    </div>
                    <p className={`text-[11px] truncate mt-0.5 ${isActive ? "text-foreground font-medium" : "text-muted"}`}>
                      {c.lastMessage || "Click to open conversation"}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Active Thread Window */}
          <div
            className={`flex-1 flex flex-col justify-between p-4 sm:p-6 bg-surface ${
              activeConvoId ? "flex" : "hidden md:flex"
            }`}
          >
            <div className="pb-4 border-b border-border flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveConvoId(null)}
                  className="md:hidden p-1.5 rounded-lg border border-border text-xs font-bold text-foreground hover:bg-surface-muted cursor-pointer"
                  title="Back to Conversations"
                >
                  ←
                </button>
                <div className="h-9 w-9 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <UserIcon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground line-clamp-1">
                    {activeConvo?.propertyTitle || "Direct Guest Conversation"}
                  </h3>
                  <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Verified Guest Inquiry
                  </p>
                </div>
              </div>

              {activeConvo?.propertyId && (
                <Link
                  href={`/properties/${activeConvo.propertyId}`}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  View Listing →
                </Link>
              )}
            </div>

            {/* Messages Thread */}
            <div className="py-6 space-y-3 flex-1 overflow-y-auto max-h-[380px]">
              {messages.length > 0 ? (
                messages.map((m, idx) => {
                  const isMe = m.senderId === firebaseUser?.uid;
                  const msgId = getMessageId(m) || `msg-${idx}`;
                  const msgContent = getMessageText(m);
                  const msgTime = formatTimestamp(m.createdAt || m.timestamp) || "Just now";

                  return (
                    <div key={msgId} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-xs sm:max-w-md rounded-2xl p-3 text-xs shadow-2xs ${
                          isMe
                            ? "bg-primary text-white rounded-br-sm font-medium"
                            : "bg-surface-muted text-foreground border border-border rounded-bl-sm font-medium"
                        }`}
                      >
                        <p className="leading-relaxed">{msgContent}</p>
                        <span className={`block text-[9px] mt-1 text-right ${isMe ? "text-white/80" : "text-muted"}`}>
                          {msgTime}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-xs text-muted py-12 font-medium">
                  <MessageCircleIcon className="w-8 h-8 text-muted/60 mx-auto mb-2" />
                  <span>No messages in this conversation yet. Send a message below to greet the guest!</span>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="flex gap-2 pt-3 border-t border-border">
              <input
                type="text"
                placeholder="Type a message to the guest..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl text-xs font-medium bg-surface-muted border border-border text-foreground placeholder-muted focus:border-primary focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={sendLoading || !messageText.trim()}
                className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white px-5 py-3 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 transition-all shadow-subtle shrink-0"
              >
                <span>{sendLoading ? "Sending..." : "Send"}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}