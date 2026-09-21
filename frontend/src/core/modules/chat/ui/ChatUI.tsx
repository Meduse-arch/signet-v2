import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';
import { coreEventBus } from '../../../../core/services/EventBus';

export interface ChatMessage {
  author: string;
  text: string;
  timestamp: number;
  type?: 'standard' | 'roll' | 'system';
}

export function ChatUI() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Utiliser une ref pour lire l'état actuel de isCollapsed dans le handler global
  const isCollapsedRef = useRef(isCollapsed);
  useEffect(() => {
    isCollapsedRef.current = isCollapsed;
  }, [isCollapsed]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // S'abonne à l'EventBus pour recevoir les messages validés par le ChatModule
    const handleNewMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    };

    coreEventBus.on('CHAT_NEW_MESSAGE', handleNewMessage);

    coreEventBus.on('CHAT_NEW_MESSAGE', handleNewMessage);

    return () => {
      coreEventBus.off('CHAT_NEW_MESSAGE', handleNewMessage);
    };
  }, []);

  useEffect(() => {
    // Autoscroll
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    // Le composant n'a aucune idée du réseau. Il crie juste "l'utilisateur a tapé ça !"
    // C'est le ChatModule (l'autoradio) qui interceptera ça.
    coreEventBus.emit('CHAT_UI_SEND', inputText.trim());
    setInputText('');
  };

  const handleClose = () => {
    coreEventBus.emit('WINDOW_CLOSE', 'toggle-chat');
  };

  return (
    <div className="flex flex-col h-full w-full pointer-events-auto">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 && (
          <div className="text-center text-zinc-500 text-xs italic mt-4">
            Aucun message. Soyez le premier à parler !
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`text-sm leading-relaxed p-3 rounded-lg border ${msg.type === 'roll' ? 'bg-rose-500/10 border-rose-500/30' : 'bg-white/5 border-white/5'}`}>
            <div className="flex items-center gap-2 mb-1">
              {msg.type === 'roll' && <span className="text-xl">🎲</span>}
              <div className="text-[#e11d48] font-bold">{msg.author}</div>
            </div>
            <div className="text-zinc-300 break-words font-medium">{msg.text}</div>
          </div>
        ))}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-4 bg-black/40 border-t border-white/10 shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Envoyer un message..."
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#e11d48]/50 transition-colors shadow-inner"
        />
      </form>
    </div>
  );
}
