"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import GlassCard from "@/components/ui/GlassCard";
import { getMyConversations, getMessages, sendMessage, markConversationAsRead } from "@/lib/api";
import { Conversation, Message } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";

export default function ChatPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendLoading, setSendLoading] = useState(false);

  const fallbackConversations: Conversation[] = [
    {
      id: "c-101",
      participantIds: ["u1", "h1"],
      propertyTitle: "Luxury 2BHK Glass Suite",
      lastMessage: "Yes, check-in time is flexible after 12 PM.",
      lastMessageTimestamp: "10:45 AM",
    },
    {
      id: "c-102",
      participantIds: ["u1", "h2"],
      propertyTitle: "Executive Single Room PG",
      lastMessage: "Food is included in monthly rent.",
      lastMessageTimestamp: "Yesterday",
    },
  ];

  const fallbackMessages: Message[] = [
    {
      id: "m1",
      conversationId: "c-101",
      senderId: "h1",
      text: "Hello! Welcome to StayTrack. Let me know if you have questions about the 2BHK Glass Suite.",
      timestamp: "10:30 AM",
    },
    {
      id: "m2",
      conversationId: "c-101",
      senderId: "u1",
      text: "Hi! Is early check-in available on Saturday?",
      timestamp: "10:40 AM",
    },
    {
      id: "m3",
      conversationId: "c-101",
      senderId: "h1",
      text: "Yes, check-in time is flexible after 12 PM.",
      timestamp: "10:45 AM",
    },
  ];

  const fetchConvos = async () => {
    setLoading(true);
    try {
      const data = await getMyConversations();
      if (data && Array.isArray(data) && data.length > 0) {
        setConversations(data);
        if (!activeConvoId) setActiveConvoId(data[0].id);
      } else {
        setConversations([]);
      }
    } catch (err) {
      console.warn("Could not fetch conversations:", err);
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
        if (msgs && Array.isArray(msgs)) {
          setMessages(msgs);
        } else {
          setMessages([]);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch messages:", err);
      });

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
      setMessages((prev) => [...prev, newMsg || {
        id: Date.now().toString(),
        conversationId: activeConvoId,
        senderId: user?.uid || "me",
        text: textToSend,
        timestamp: "Just now",
      }]);
    } catch (err: any) {
      alert("Failed to send message: " + err.message);
    } finally {
      setSendLoading(false);
    }
  };

  const displayConvos = conversations.length > 0 ? conversations : fallbackConversations;
  const activeConvo = displayConvos.find((c) => c.id === activeConvoId) || displayConvos[0];
  const displayMessages = messages.length > 0 ? messages : (activeConvoId === "c-101" ? fallbackMessages : []);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-8 w-full flex-1 flex flex-col">
        <div className="mb-4">
          <h1 className="text-3xl font-black text-zinc-950">Direct Messages</h1>
          <p className="text-xs text-zinc-500 font-semibold mt-1">Chat directly with property owners and managers</p>
        </div>

        <GlassCard className="flex-1 min-h-[500px] border border-zinc-200 p-0 overflow-hidden flex flex-col md:flex-row shadow-lg">
          {/* Chat Sidebar */}
          <div className="w-full md:w-80 border-r border-zinc-200 bg-zinc-50 p-4 space-y-2">
            <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider px-2 mb-3">Conversations</h3>
            {loading ? (
              <div className="py-6 text-center text-xs font-bold text-zinc-500">Loading chats...</div>
            ) : (
              displayConvos.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setActiveConvoId(c.id)}
                  className={`p-3 rounded-xl cursor-pointer transition-all ${
                    (activeConvoId || displayConvos[0]?.id) === c.id
                      ? "bg-black text-white"
                      : "hover:bg-zinc-200/60 text-zinc-900"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-xs font-bold line-clamp-1">{c.propertyTitle || "Stay Inquiry"}</h4>
                    <span className={`text-[10px] ${activeConvoId === c.id ? "text-zinc-300" : "text-zinc-500"}`}>{c.lastMessageTimestamp || ""}</span>
                  </div>
                  <p className={`text-[11px] truncate mt-1 ${activeConvoId === c.id ? "text-zinc-400" : "text-zinc-500"}`}>{c.lastMessage || "Click to view chat"}</p>
                </div>
              ))
            )}
          </div>

          {/* Active Chat Window */}
          <div className="flex-1 flex flex-col justify-between p-6 bg-white">
            <div className="pb-4 border-b border-zinc-200 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs">
                🏠
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-950">{activeConvo?.propertyTitle || "Host Conversation"}</h3>
                <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Direct Host Verified
                </p>
              </div>
            </div>

            {/* Messages Thread */}
            <div className="py-6 space-y-4 flex-1 overflow-y-auto">
              {displayMessages.map((m) => {
                const isMe = m.senderId === user?.uid || m.senderId === "u1" || m.senderId === "me";
                return (
                  <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-xs rounded-2xl p-3 text-xs font-medium shadow-sm ${
                        isMe
                          ? "bg-black text-white"
                          : "bg-zinc-100 text-zinc-800 border border-zinc-200"
                      }`}
                    >
                      {m.text}
                      <span className={`block text-[9px] mt-1 text-right ${isMe ? "text-zinc-400" : "text-zinc-400"}`}>
                        {m.timestamp || "Just now"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Message Input Box */}
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <input
                type="text"
                placeholder="Type your message to host..."
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
      </main>

      <Footer />
    </div>
  );
}

