import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Bot, Copy, MessageSquarePlus, Save, Send, Sparkles, Trash2, User as UserIcon } from 'lucide-react';
import { supabase, trackEvent, type ChatMessage, type ChatThread } from '../../lib/supabase';
import { callAIChat } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Input';
import { Card, EmptyState, Skeleton } from '../../components/ui';
import { cn, formatRelative } from '../../lib/utils';

const SUBJECTS = ['General', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'History', 'Computer Science', 'Economics', 'Literature'];

export function AITutor() {
  const { user } = useAuth();
  const { push } = useToast();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [subject, setSubject] = useState('General');
  const [sending, setSending] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingThreads(true);
      const { data } = await supabase.from('chat_threads').select('*').order('updated_at', { ascending: false });
      const list = (data as ChatThread[]) ?? [];
      setThreads(list);
      if (list.length > 0) await openThread(list[0]);
      setLoadingThreads(false);
    })();
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  async function openThread(thread: ChatThread) {
    setActiveThread(thread);
    setLoadingMessages(true);
    setApiError(null);
    setSubject(thread.subject ?? 'General');
    const { data } = await supabase.from('chat_messages').select('*').eq('thread_id', thread.id).order('created_at', { ascending: true });
    setMessages((data as ChatMessage[]) ?? []);
    setLoadingMessages(false);
  }

  async function newThread() {
    if (!user) return;
    const { data, error } = await supabase.from('chat_threads').insert({ title: 'New chat', subject }).select().single();
    if (error || !data) { push('error', 'Could not create chat'); return; }
    const thread = data as ChatThread;
    setThreads((t) => [thread, ...t]);
    setMessages([]);
    setApiError(null);
    await openThread(thread);
  }

  async function send() {
    if (!user || !input.trim() || !activeThread || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    setApiError(null);

    const tempUserMsg: ChatMessage = { id: `tmp-${Date.now()}`, thread_id: activeThread.id, user_id: user.id, role: 'user', content, created_at: new Date().toISOString() };
    setMessages((m) => [...m, tempUserMsg]);

    await supabase.from('chat_messages').insert({ thread_id: activeThread.id, role: 'user', content });

    if (messages.length === 0) {
      const title = content.length > 45 ? content.slice(0, 45) + '…' : content;
      await supabase.from('chat_threads').update({ title, subject }).eq('id', activeThread.id);
      setThreads((t) => t.map((x) => (x.id === activeThread.id ? { ...x, title } : x)));
      setActiveThread((t) => (t ? { ...t, title } : t));
    }

    // Build full history for context window
    const history = [...messages, tempUserMsg].map((m) => ({ role: m.role, content: m.content }));
    const { content: reply, error } = await callAIChat(history, subject === 'General' ? undefined : subject);

    if (error) {
      setApiError(error);
      setSending(false);
      return;
    }

    const tempAiMsg: ChatMessage = { id: `tmp-ai-${Date.now()}`, thread_id: activeThread.id, user_id: user.id, role: 'assistant', content: reply, created_at: new Date().toISOString() };
    setMessages((m) => [...m, tempAiMsg]);
    await supabase.from('chat_messages').insert({ thread_id: activeThread.id, role: 'assistant', content: reply });
    await supabase.from('chat_threads').update({ updated_at: new Date().toISOString() }).eq('id', activeThread.id);
    await trackEvent('ai_chat_message', { subject });
    setSending(false);
  }

  async function deleteThread(thread: ChatThread) {
    await supabase.from('chat_threads').delete().eq('id', thread.id);
    const remaining = threads.filter((t) => t.id !== thread.id);
    setThreads(remaining);
    if (activeThread?.id === thread.id) {
      setMessages([]);
      if (remaining.length > 0) await openThread(remaining[0]);
      else setActiveThread(null);
    }
    push('success', 'Chat deleted');
  }

  async function copyMessage(content: string) { await navigator.clipboard.writeText(content); push('success', 'Copied'); }
  async function saveAsNote(content: string) {
    if (!user) return;
    await supabase.from('notes').insert({ title: 'Saved AI answer', content, summary: content.slice(0, 200) });
    push('success', 'Saved to your notes');
  }

  return (
    <div className="grid h-[calc(100vh-8rem)] grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
      {/* Thread list */}
      <Card className="flex flex-col !p-0">
        <div className="border-b border-ink-100 p-3 dark:border-ink-800">
          <Button size="sm" className="w-full" onClick={newThread}><MessageSquarePlus className="h-4 w-4" /> New chat</Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loadingThreads ? (
            <div className="space-y-2 p-2">{[0,1,2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : threads.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-ink-400">No chats yet</p>
          ) : (
            threads.map((t) => (
              <div key={t.id} onClick={() => openThread(t)} className={cn('group flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 transition', activeThread?.id === t.id ? 'bg-brand-50 dark:bg-brand-950/50' : 'hover:bg-ink-100 dark:hover:bg-ink-800')}>
                <Sparkles className="h-4 w-4 shrink-0 text-ink-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  <p className="text-[10px] text-ink-400">{t.subject ?? 'General'} · {formatRelative(t.updated_at)}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteThread(t); }} className="opacity-0 text-ink-300 transition hover:text-red-500 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Chat area */}
      <Card className="flex flex-col !p-0">
        {/* Header with subject selector */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 p-3 dark:border-ink-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white"><Bot className="h-4 w-4" /></div>
            <div>
              <p className="text-sm font-semibold">{activeThread?.title ?? 'AI Tutor'}</p>
              <p className="text-[10px] text-ink-400">Powered by Google Gemini</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {SUBJECTS.slice(0, 5).map((s) => (
              <button key={s} onClick={() => setSubject(s)} className={cn('rounded-full px-2.5 py-1 text-xs font-medium transition', subject === s ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300')}>
                {s}
              </button>
            ))}
            <select value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-full border border-ink-200 bg-ink-100 px-2 py-1 text-xs dark:border-ink-700 dark:bg-ink-800">
              {SUBJECTS.slice(5).map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
          {apiError && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">AI Tutor unavailable</p>
                <p className="mt-0.5 text-xs opacity-80">{apiError}</p>
                {apiError.includes('API key') && <p className="mt-1 text-xs">Add your GEMINI_API_KEY in Supabase project settings → Edge Functions → Secrets.</p>}
              </div>
            </div>
          )}
          {loadingMessages ? (
            <div className="space-y-3">{[0,1,2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : messages.length === 0 ? (
            <EmptyState icon={Sparkles} title="Ask anything" description={`I'm your AI tutor for ${subject}. Ask a question, request a step-by-step explanation, or say "quiz me".`} />
          ) : (
            <div className="space-y-5">
              {messages.map((m) => (
                <div key={m.id} className={cn('flex gap-3 animate-slide-up', m.role === 'user' && 'flex-row-reverse')}>
                  <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', m.role === 'user' ? 'bg-ink-100 text-ink-600 dark:bg-ink-800' : 'bg-gradient-to-br from-brand-500 to-brand-700 text-white')}>
                    {m.role === 'user' ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={cn('group max-w-[80%]', m.role === 'user' && 'flex flex-col items-end')}>
                    <div className={cn('rounded-2xl px-4 py-2.5 text-sm leading-relaxed', m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-800 dark:bg-ink-800 dark:text-ink-100')}>
                      <FormattedContent content={m.content} />
                    </div>
                    {m.role === 'assistant' && (
                      <div className="mt-1.5 flex gap-1 opacity-0 transition group-hover:opacity-100">
                        <button onClick={() => copyMessage(m.content)} className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800" title="Copy"><Copy className="h-3.5 w-3.5" /></button>
                        <button onClick={() => saveAsNote(m.content)} className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800" title="Save as note"><Save className="h-3.5 w-3.5" /></button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white"><Bot className="h-4 w-4" /></div>
                  <div className="rounded-2xl bg-ink-100 px-4 py-3 dark:bg-ink-800">
                    <div className="flex gap-1.5">{[0,1,2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-ink-400" style={{ animationDelay: `${i * 150}ms` }} />)}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-ink-100 p-3 dark:border-ink-800">
          <div className="flex items-end gap-2">
            <Textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={`Ask about ${subject}…`} rows={1} className="max-h-32 min-h-[44px] resize-none" />
            <Button onClick={send} disabled={!input.trim() || sending} className="h-[44px] !px-3"><Send className="h-4 w-4" /></Button>
          </div>
          <p className="mt-1.5 text-[10px] text-ink-400">Enter to send · Shift+Enter for newline · Powered by Google Gemini</p>
        </div>
      </Card>
    </div>
  );
}

function FormattedContent({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('```')) return <code key={i} className="block rounded bg-ink-900/10 px-2 py-1 font-mono text-xs">{line.replace(/^```\w*|```$/g, '')}</code>;
        if (line.startsWith('> ')) return <blockquote key={i} className="border-l-2 border-current pl-3 opacity-80 italic">{renderInline(line.slice(2))}</blockquote>;
        if (/^[-*]\s/.test(line)) return <div key={i} className="flex gap-1.5"><span className="opacity-50 select-none">•</span><span>{renderInline(line.slice(2))}</span></div>;
        if (/^\d+\.\s/.test(line)) return <div key={i} className="flex gap-1.5"><span className="opacity-50 select-none">{line.match(/^\d+/)?.[0]}.</span><span>{renderInline(line.replace(/^\d+\.\s/, ''))}</span></div>;
        if (/^#{1,3}\s/.test(line)) return <p key={i} className="font-bold">{renderInline(line.replace(/^#+\s/, ''))}</p>;
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>;
    if (p.startsWith('`') && p.endsWith('`')) return <code key={i} className="rounded bg-ink-900/10 px-1 font-mono text-xs">{p.slice(1, -1)}</code>;
    return p;
  });
}
