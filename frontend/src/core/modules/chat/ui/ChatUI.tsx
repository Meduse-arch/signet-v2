import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';
import { coreEventBus } from '../../../../core/services/EventBus';

export interface ChatMessage {
  author: string;
  text: string;
  timestamp: number;
}

export function ChatUI() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Émettre l'état actif au gestionnaire global (pour allumer/éteindre le bouton)
  useEffect(() => {
    coreEventBus.emit('SYSTEM_UI_ACTION_STATE_CHANGED', { actionId: 'toggle-chat', isActive: isOpen });
  }, [isOpen]);

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

    const handleToggle = () => {
      setIsOpen(prevOpen => {
        if (prevOpen) {
          // S'il est ouvert (plié ou non) -> on le ferme complètement
          return false;
        } else {
          // S'il est fermé -> on l'allume mais en mode plié
          setIsCollapsed(true);
          return true;
        }
      });
    };
    coreEventBus.on('CHAT_TOGGLE_WINDOW', handleToggle);

    return () => {
      coreEventBus.off('CHAT_NEW_MESSAGE', handleNewMessage);
      coreEventBus.off('CHAT_TOGGLE_WINDOW', handleToggle);
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

  if (!isOpen) return null;

  const handleClose = () => {
    setIsOpen(false);
    setIsCollapsed(false);
  };

  return (
    <div className={`fixed top-0 right-0 h-full w-[350px] flex flex-col bg-[#050508]/95 backdrop-blur-xl border-l border-white/10 shadow-2xl z-40 pointer-events-auto transform transition-transform duration-300 ease-in-out ${isCollapsed ? 'translate-x-full' : 'translate-x-0'}`}>
      
      {/* Toggle Button (Visible even when collapsed) */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-1/2 -left-10 -translate-y-1/2 w-10 h-16 bg-[#050508]/95 backdrop-blur-xl border-y border-l border-white/10 flex items-center justify-center rounded-l-xl text-white/50 hover:text-white transition-colors shadow-[-10px_0_20px_rgba(0,0,0,0.5)]"
      >
        {isCollapsed ? <ChevronLeft className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
      </button>

      {/* Header */}
      <div className="bg-white/5 border-b border-white/10 p-4 flex justify-between items-center shrink-0">
        <h3 className="text-zinc-300 text-sm font-bold tracking-widest uppercase">Chat de Session</h3>
        <button onClick={handleClose} className="text-white/50 hover:text-rose-400 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 && (
          <div className="text-center text-zinc-500 text-xs italic mt-4">
            Aucun message. Soyez le premier à parler !
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className="text-sm leading-relaxed bg-white/5 p-3 rounded-lg border border-white/5">
            <div className="text-[#e11d48] font-bold mb-1">{msg.author}</div>
            <div className="text-zinc-300 break-words">{msg.text}</div>
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
