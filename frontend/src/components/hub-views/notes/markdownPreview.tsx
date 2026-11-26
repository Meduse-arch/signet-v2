import type { ReactNode } from 'react';

/** Aperçu Markdown basique (titres, listes, citations, blocs de code). Fonction pure. */
export function renderMarkdownPreview(text: string): ReactNode[] {
  const lines = text.split('\n');
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  const elements: ReactNode[] = [];

  lines.forEach((line, index) => {
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${index}`} className="bg-black/60 border border-white/10 rounded-lg p-3 my-2 font-mono text-xs text-rose-300 overflow-x-auto">
            <code>{codeBuffer.join('\n')}</code>
          </pre>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }

    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={index} className="text-2xl font-black text-white mt-4 mb-2 pb-1.5 border-b border-white/10 tracking-tight">
          {line.slice(2)}
        </h1>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={index} className="text-xl font-extrabold text-white mt-3 mb-1.5 tracking-tight">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={index} className="text-base font-bold text-rose-400 mt-2.5 mb-1">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={index} className="border-l-4 border-rose-500 bg-white/5 pl-3 py-1 my-1.5 italic text-slate-300 rounded-r text-sm">
          {line.slice(2)}
        </blockquote>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <li key={index} className="ml-5 list-disc text-sm text-slate-200 my-0.5">
          {line.slice(2)}
        </li>
      );
    } else if (/^\d+\.\s/.test(line)) {
      elements.push(
        <li key={index} className="ml-5 list-decimal text-sm text-slate-200 my-0.5">
          {line.replace(/^\d+\.\s/, '')}
        </li>
      );
    } else if (line.trim() === '---' || line.trim() === '***') {
      elements.push(<hr key={index} className="border-white/10 my-4" />);
    } else if (line.trim() === '') {
      elements.push(<div key={index} className="h-2" />);
    } else {
      elements.push(
        <p key={index} className="text-sm text-slate-300 leading-relaxed my-1">
          {line}
        </p>
      );
    }
  });

  return elements;
}
