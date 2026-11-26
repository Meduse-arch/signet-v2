import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { coreEventBus } from '../../../../core/services/EventBus';
import { parseRollMessage } from './rollMessage';

export interface ChatMessage {
  author: string;
  text: string;
  timestamp: number;
  type?: 'standard' | 'roll' | 'system';
}

const timeOf = (ts: number) => new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

/** Carte de jet : auteur · action, formule, total mis en valeur. */
function RollCard({ msg }: { msg: ChatMessage }) {
  const roll = parseRollMessage(msg.text, msg.type);
  if (!roll) return null;
  return (
    <div className="rounded-xl border border-hairline bg-surface p-3">
      <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
        <span className="truncate"><span className="text-rose-300">{msg.author}</span> · {roll.title}</span>
        <span className="num shrink-0">{timeOf(msg.timestamp)}</span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          {roll.formula && <div className="num text-[13px] text-zinc-400 break-words">{roll.formula}</div>}
          {roll.note && <div className="mt-0.5 text-xs text-zinc-500 break-words">{roll.note}</div>}
        </div>
        <div className="num text-[28px] leading-none font-medium text-white">{roll.total}</div>
      </div>
    </div>
  );
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
    <div className="flex flex-col h-full w-full pointer-events-auto">
      {/* Messages */}
      <div role="log" aria-live="polite" aria-label="Messages du chat" className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 flex flex-col gap-4 custom-scrollbar">
        {messages.length === 0 && (
          <div className="text-center text-zinc-500 text-[13px] mt-4">Aucun message pour l'instant</div>
        )}
        {messages.map((msg, idx) => {
          if (parseRollMessage(msg.text, msg.type)) return <RollCard key={idx} msg={msg} />;
          if (msg.type === 'system') {
            return <div key={idx} className="text-center text-xs text-zinc-500 break-words">{msg.text}</div>;
          }
          return (
            <div key={idx} className="text-[13px] leading-relaxed">
              <div className="flex items-baseline gap-2">
                <span className="font-medium text-rose-300 truncate">{msg.author}</span>
                <span className="num text-[11px] text-zinc-600 shrink-0">{timeOf(msg.timestamp)}</span>
              </div>
              <p className="mt-0.5 text-zinc-300 break-words">{msg.text}</p>
            </div>
          );
        })}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Saisie */}
      <form onSubmit={handleSend} className="p-3 border-t border-hairline shrink-0">
        <div className="flex items-center gap-2 h-11 pl-3.5 pr-1.5 rounded-lg bg-white/[.04] border border-white/[.08] focus-within:border-rose-500 focus-within:ring-1 focus-within:ring-rose-500 transition-colors">
          <input
            type="text"
            name="message"
            aria-label="Message"
            autoComplete="off"
            enterKeyHint="send"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Message ou /roll 1d20"
            className="flex-1 min-w-0 bg-transparent text-base md:text-[13px] text-white placeholder-zinc-600 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            title="Envoyer"
            aria-label="Envoyer"
            className="w-8 h-8 shrink-0 grid place-items-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
