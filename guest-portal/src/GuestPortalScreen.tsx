import { useState, useRef, useEffect } from 'react';
import { Send, Hotel } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { InternalMessage } from './types';

interface GuestPortalProps {
  messages: InternalMessage[];
  onAddMessage: (text: string) => void;
  initialRoom?: string;
}

export function GuestPortalScreen({ messages, onAddMessage, initialRoom = '' }: GuestPortalProps) {
  const [room, setRoom] = useState(initialRoom);
  const [input, setInput] = useState('');
  const [roomSet, setRoomSet] = useState(!!initialRoom);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !roomSet) return;
    onAddMessage(input.trim());
    setInput('');
  };

  const handleSetRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (room.trim()) setRoomSet(true);
  };

  if (!roomSet) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-sm mx-auto bg-white border border-[#eae8e4] p-8 rounded-[32px] shadow-xl relative w-full"
      >
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center">
            <Hotel className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="font-black text-xl text-black">Welcome</h2>
            <p className="text-xs text-zinc-500 mt-1">Enter your room to start chatting</p>
          </div>
          <form onSubmit={handleSetRoom} className="w-full space-y-3">
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="Room number (e.g. 402)"
              className="w-full bg-[#f5f5f5] border border-zinc-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-black/10 text-center"
              autoFocus
            />
            <button
              type="submit"
              disabled={!room.trim()}
              className="w-full bg-black hover:bg-zinc-800 disabled:bg-zinc-300 text-white font-extrabold text-xs uppercase tracking-wider py-3 rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
            >
              Join Chat
            </button>
          </form>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-sm mx-auto bg-white border border-[#eae8e4] rounded-[32px] shadow-xl relative w-full flex flex-col h-[600px]"
    >
      <div className="bg-black text-white px-5 py-4 rounded-t-[32px] flex items-center gap-3">
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
          <Hotel className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-black tracking-tight">Room {room}</p>
          <p className="text-[9px] text-white/60 font-semibold uppercase tracking-wider">Guest Chat</p>
        </div>
        <button
          onClick={() => setRoomSet(false)}
          className="text-[9px] text-white/50 hover:text-white font-bold uppercase tracking-wider cursor-pointer transition"
        >
          Change
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-[#faf9f6]">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-zinc-400 font-medium">Send a message to get started</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex flex-col ${msg.senderName === `Room ${room}` ? 'items-end' : 'items-start'}`}
            >
              <span className="text-[8px] text-zinc-400 font-bold uppercase px-1 mb-0.5">
                {msg.senderName}
              </span>
              <div
                className={`px-3.5 py-2 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                  msg.senderName === `Room ${room}`
                    ? 'bg-black text-white rounded-br-sm'
                    : 'bg-white border border-zinc-200 text-zinc-800 rounded-bl-sm shadow-xs'
                }`}
              >
                {msg.text}
              </div>
              <span className="text-[7px] text-zinc-300 font-mono mt-0.5 px-1">
                {msg.timestamp}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-[#f0eeeb] flex gap-2 bg-white rounded-b-[32px]">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your request..."
          className="flex-1 bg-[#f5f5f5] border border-zinc-200 rounded-xl px-4 py-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-black/10"
          autoFocus
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="bg-black hover:bg-zinc-800 disabled:bg-zinc-300 text-white p-2.5 rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </motion.div>
  );
}
