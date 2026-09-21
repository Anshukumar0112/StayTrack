"use client";

import { useEffect, useState, use } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlassCard from "@/components/ui/GlassCard";
import Link from "next/link";
import { getConversation, getMessages, sendMessage, markConversationAsRead } from "@/lib/api";
import { Conversation, Message } from "@/types/booking";
import { useAuth } from "@/hooks/useAuth";

export default function SingleConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = use(params);
  const { user } = useAuth();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendLoading, setSendLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      getConversation(conversationId),
      getMessages(conversationId),
    ]).then(([convoRes, msgsRes]) => {
      if (convoRes.status === "fulfilled" && convoRes.value) {
        setConversation(convoRes.value);
      }
      if (msgsRes.status === "fulfilled" && Array.isArray(msgsRes.value)) {
        setMessages(msgsRes.value);
      }
    }).finally(() => setLoading(false));

    markConversationAsRead(conversationId).catch(() => {});
  }, [conversationId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setSendLoading(true);
    const msgText = text;
    setText("");

    try {
      const newMsg = await sendMessage(conversationId, msgText);
      if (newMsg) {
        setMessages((prev) => [...prev, newMsg]);
      }
    } catch (err: any) {
      alert("Failed to send: " + err.message);
    } finally {
      setSendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 w-full flex-1 flex flex-col">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
            <Link href="/chat" className="hover:text-black">All Chats</Link>
            <span>/</span>
            <span className="text-zinc-900 font-bold">{conversation?.propertyTitle || `Conversation #${conversationId}`}</span>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs font-bold text-zinc-500">Loading conversation...</div>
        ) : (
          <GlassCard className="flex-1 border border-zinc-200 p-6 flex flex-col justify-between shadow-xl">
            <div className="pb-4 border-b border-zinc-200">
              <h1 className="text-lg font-black text-zinc-950">{conversation?.propertyTitle || "Host Direct Chat"}</h1>
              <p className="text-xs text-zinc-500 mt-0.5">Conversation ID: {conversationId}</p>
            </div>

            <div className="py-6 space-y-3 flex-1 overflow-y-auto max-h-[450px]">
              {messages.length > 0 ? (
                messages.map((m) => {
                  const isMe = m.senderId === user?.uid;
                  return (
                    <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-md rounded-2xl p-3 text-xs font-medium shadow-sm ${
                          isMe ? "bg-black text-white" : "bg-zinc-100 text-zinc-800 border border-zinc-200"
                        }`}
                      >
                        {m.text}
                        <span className={`block text-[9px] mt-1 text-right ${isMe ? "text-zinc-400" : "text-zinc-400"}`}>
                          {m.timestamp || "Just now"}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-xs text-zinc-400 py-12">No messages in this chat yet.</p>
              )}
            </div>

            <form onSubmit={handleSend} className="flex gap-3 pt-4 border-t border-zinc-200">
              <input
                type="text"
                placeholder="Type your message..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="glass-input flex-1 px-4 py-3 rounded-xl text-xs font-semibold"
              />
              <button
                type="submit"
                disabled={sendLoading || !text.trim()}
                className="glass-button px-6 py-3 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {sendLoading ? "Sending..." : "Send"}
              </button>
            </form>
          </GlassCard>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
