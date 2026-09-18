import React, { useState, useEffect, useRef } from 'react';
import { coreEventBus } from '../../core/services/EventBus';

export interface ChatMessage {
  author: string;
  text: string;
  timestamp: number;
}

export function ChatUI() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // S'abonne à l'EventBus pour recevoir les messages validés par le ChatModule
    const handleNewMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    };

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

  return (
    <div className="absolute bottom-6 right-6 w-80 h-96 flex flex-col bg-[#050508]/80 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-2xl animate-fade-in pointer-events-auto">
      {/* Header */}
      <div className="bg-white/5 border-b border-white/10 p-3">
        <h3 className="text-zinc-300 text-xs font-bold tracking-widest uppercase">Chat de Session</h3>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {messages.length === 0 && (
          <div className="text-center text-zinc-500 text-xs italic mt-4">
            Aucun message. Soyez le premier à parler !
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className="text-sm leading-relaxed">
            <span className="text-[#e11d48] font-bold mr-2">{msg.author}</span>
            <span className="text-zinc-300">{msg.text}</span>
          </div>
        ))}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-3 bg-black/40 border-t border-white/10 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Envoyer un message..."
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#e11d48]/50 transition-colors"
        />
      </form>
    </div>
  );
}
