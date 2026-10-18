"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlassCard from "@/components/ui/GlassCard";
import { MessageCircleIcon, Building2Icon } from "@/components/ui/Icons";
import { getMyConversations, getMessages, sendMessage, markConversationAsRead } from "@/lib/api";
import { Conversation, Message, getConversationId, formatTimestamp, getMessageText, getMessageId } from "@/types/booking";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

export default function ChatPage() {
  const { user } = useAuth();
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
    fetchConvos();
  }, []);

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
      alert("Failed to send message: " + err.message);
    } finally {
      setSendLoading(false);
    }
  };

  const activeConvo = conversations.find((c) => getConversationId(c) === activeConvoId);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="stay-container pt-6 pb-28 md:py-8 flex-1 flex flex-col">
        <div className="mb-4">
          <h1 className="text-3xl font-black text-foreground">Direct Messages</h1>
          <p className="text-xs text-muted font-semibold mt-1">Chat directly with property hosts & guests</p>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs font-bold text-muted">Loading conversations...</div>
        ) : conversations.length === 0 ? (
          <GlassCard className="py-16 text-center border border-border bg-surface shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-surface-muted border border-border flex items-center justify-center mx-auto mb-3">
              <MessageCircleIcon className="w-6 h-6 text-muted" />
            </div>
            <h3 className="text-base font-bold text-foreground mt-1">No Active Conversations</h3>
            <p className="text-xs text-muted mt-1 max-w-sm mx-auto">Start a chat by viewing a property and clicking "Chat with Host".</p>
            <Link href="/properties" className="mt-4 inline-block rounded-xl bg-primary hover:bg-primary-dark text-white px-5 py-2.5 text-xs font-bold shadow-xs">
              Browse Properties
            </Link>
          </GlassCard>
        ) : (
          <GlassCard className="flex-1 min-h-[500px] border border-border p-0 overflow-hidden flex flex-col md:flex-row shadow-md bg-surface">
            {/* Conversations Sidebar */}
            <div className={`w-full md:w-80 border-r border-border bg-background p-4 space-y-2 ${
              activeConvoId ? "hidden md:block" : "block"
            }`}>
              <h3 className="text-xs font-bold text-muted uppercase tracking-wider px-2 mb-3">Conversations</h3>
              {conversations.map((c) => {
                const convoId = getConversationId(c);
                const isActive = activeConvoId === convoId;

                return (
                  <div
                    key={convoId}
                    onClick={() => setActiveConvoId(convoId)}
                    className={`p-3 rounded-xl cursor-pointer transition-all ${
                      isActive
                        ? "bg-primary-light text-primary-dark border-l-4 border-primary font-bold shadow-xs"
                        : "hover:bg-primary-soft text-foreground"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-xs font-bold line-clamp-1">{c.propertyTitle || `Stay Chat #${convoId}`}</h4>
                      <span className={`text-[10px] ${isActive ? "text-primary-dark/70" : "text-muted"}`}>
                        {formatTimestamp(c.lastMessageTimestamp || c.lastMessageAt)}
                      </span>
                    </div>
                    <p className={`text-[11px] truncate mt-1 ${isActive ? "text-primary-dark/80" : "text-muted"}`}>
                      {c.lastMessage || "Click to view thread"}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Active Thread Window */}
            <div className={`flex-1 flex flex-col justify-between p-4 sm:p-6 bg-surface ${
              activeConvoId ? "flex" : "hidden md:flex"
            }`}>
              <div className="pb-4 border-b border-border flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveConvoId(null)}
                    className="md:hidden p-1.5 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-background"
                    title="Back to Conversations"
                  >
                    ← Back
                  </button>
                  <div className="h-9 w-9 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                    <Building2Icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground line-clamp-1">{activeConvo?.propertyTitle || "Host Conversation"}</h3>
                    <p className="text-[11px] text-success font-bold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Direct Host Connect
                    </p>
                  </div>
                </div>

                <Link
                  href={`/chat/${activeConvoId}`}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Full View →
                </Link>
              </div>

              {/* Messages List */}
              <div className="py-6 space-y-3 flex-1 overflow-y-auto max-h-[400px]">
                {messages.length > 0 ? (
                  messages.map((m, idx) => {
                    const isMe = m.senderId === user?.uid;
                    const msgId = getMessageId(m) || `msg-${idx}`;
                    const msgContent = getMessageText(m);
                    const msgTime = formatTimestamp(m.createdAt || m.timestamp) || "Just now";

                    return (
                      <div key={msgId} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-xs rounded-2xl p-3 text-xs font-medium shadow-xs ${
                            isMe ? "bg-primary text-white" : "bg-background text-foreground border border-border"
                          }`}
                        >
                          {msgContent}
                          <span className={`block text-[9px] mt-1 text-right ${isMe ? "text-white/80" : "text-muted"}`}>
                            {msgTime}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-xs text-muted py-10 font-medium">
                    No messages yet in this conversation. Type below to start!
                  </p>
                )}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendMessage} className="flex gap-3 pt-3 border-t border-border">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl text-xs font-semibold bg-background border border-border text-foreground placeholder-muted/70 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
                <button
                  type="submit"
                  disabled={sendLoading || !messageText.trim()}
                  className="bg-primary hover:bg-primary-dark text-white px-5 py-3 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 transition-all shadow-xs"
                >
                  {sendLoading ? "Sending..." : "Send"}
                </button>
              </form>
            </div>
          </GlassCard>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
