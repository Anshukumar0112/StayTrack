"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlassCard from "@/components/ui/GlassCard";
import { getMyConversations, getMessages, sendMessage, markConversationAsRead } from "@/lib/api";
import { Conversation, Message } from "@/types/booking";
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
          setActiveConvoId(data[0].id);
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
      } else {
        fetchConvos();
      }
    } catch (err: any) {
      alert("Failed to send message: " + err.message);
    } finally {
      setSendLoading(false);
    }
  };

  const activeConvo = conversations.find((c) => c.id === activeConvoId);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 w-full flex-1 flex flex-col">
        <div className="mb-4">
          <h1 className="text-3xl font-black text-zinc-950">Direct Messages</h1>
          <p className="text-xs text-zinc-500 font-semibold mt-1">Chat directly with property hosts & guests</p>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs font-bold text-zinc-500">Loading conversations...</div>
        ) : conversations.length === 0 ? (
          <GlassCard className="py-16 text-center border border-zinc-200">
            <span className="text-4xl">💬</span>
            <h3 className="text-base font-bold text-zinc-950 mt-3">No Active Conversations</h3>
            <p className="text-xs text-zinc-500 mt-1">Start a chat by viewing a property and clicking "Chat with Host".</p>
            <Link href="/properties" className="mt-4 inline-block rounded-xl bg-black text-white px-5 py-2.5 text-xs font-bold">
              Browse Properties
            </Link>
          </GlassCard>
        ) : (
          <GlassCard className="flex-1 min-h-[500px] border border-zinc-200 p-0 overflow-hidden flex flex-col md:flex-row shadow-lg">
            {/* Conversations Sidebar */}
            <div className="w-full md:w-80 border-r border-zinc-200 bg-zinc-50 p-4 space-y-2">
              <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider px-2 mb-3">Conversations</h3>
              {conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setActiveConvoId(c.id)}
                  className={`p-3 rounded-xl cursor-pointer transition-all ${
                    activeConvoId === c.id
                      ? "bg-black text-white"
                      : "hover:bg-zinc-200/60 text-zinc-900"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-xs font-bold line-clamp-1">{c.propertyTitle || `Stay Chat #${c.id}`}</h4>
                    <span className={`text-[10px] ${activeConvoId === c.id ? "text-zinc-300" : "text-zinc-500"}`}>
                      {c.lastMessageTimestamp || ""}
                    </span>
                  </div>
                  <p className={`text-[11px] truncate mt-1 ${activeConvoId === c.id ? "text-zinc-400" : "text-zinc-500"}`}>
                    {c.lastMessage || "Click to view thread"}
                  </p>
                </div>
              ))}
            </div>

            {/* Active Thread Window */}
            <div className="flex-1 flex flex-col justify-between p-6 bg-white">
              <div className="pb-4 border-b border-zinc-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs">
                    🏠
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-950">{activeConvo?.propertyTitle || "Host Conversation"}</h3>
                    <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Direct Host Connect
                    </p>
                  </div>
                </div>

                <Link
                  href={`/chat/${activeConvoId}`}
                  className="text-xs font-bold text-black hover:underline"
                >
                  Full View →
                </Link>
              </div>

              {/* Messages List */}
              <div className="py-6 space-y-3 flex-1 overflow-y-auto max-h-[400px]">
                {messages.length > 0 ? (
                  messages.map((m) => {
                    const isMe = m.senderId === user?.uid;
                    return (
                      <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-xs rounded-2xl p-3 text-xs font-medium shadow-sm ${
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
                  <p className="text-center text-xs text-zinc-400 py-10 font-medium">
                    No messages yet in this conversation. Type below to start!
                  </p>
                )}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendMessage} className="flex gap-3 pt-3 border-t border-zinc-100">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="glass-input flex-1 px-4 py-3 rounded-xl text-xs font-semibold"
                />
                <button
                  type="submit"
                  disabled={sendLoading || !messageText.trim()}
                  className="glass-button px-5 py-3 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
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
