import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle, CheckCircle2, Clock, Download,
  FileText, FileUp, Layers, RefreshCw, Save, Trash2, Upload,
} from 'lucide-react';
import { supabase, trackEvent, type PdfUpload, type QuizQuestion } from '../../lib/supabase';
import { callPdfProcess } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { Button } from '../../components/ui/Button';
import { Card, EmptyState, Badge, Skeleton } from '../../components/ui';
import { cn, download as dl, formatDate } from '../../lib/utils';

async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return extractPdfText(file);
  }
  return file.text();
}

async function extractPdfText(file: File): Promise<string> {
  try {
    // Load PDF.js from CDN
    // @ts-expect-error global set by cdn script
    if (!window.pdfjsLib) {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('PDF.js failed to load'));
        document.head.appendChild(s);
      });
      // @ts-expect-error global
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
    // @ts-expect-error global
    const pdfjsLib = window.pdfjsLib;
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= Math.min(pdf.numPages, 30); i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      pages.push(tc.items.map((item: { str: string }) => item.str).join(' '));
    }
    return pages.join('\n\n');
  } catch {
    return file.text();
  }
}

export function PDFPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploads, setUploads] = useState<PdfUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PdfUpload | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'quiz' | 'flashcards'>('summary');

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('pdf_uploads').select('*').order('created_at', { ascending: false });
      setUploads((data as PdfUpload[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  async function handleFile(file: File) {
    if (!user) return;
    if (file.size > 20 * 1024 * 1024) { push('warning', 'File too large (max 20 MB)'); return; }
    push('info', `Reading "${file.name}"…`);

    const { data: record, error } = await supabase
      .from('pdf_uploads')
      .insert({ filename: file.name, file_size: file.size, status: 'pending' })
      .select().single();
    if (error || !record) { push('error', 'Could not create upload record'); return; }

    const upload = record as PdfUpload;
    setUploads((u) => [upload, ...u]);
    setSelected(upload);
    setProcessing(upload.id);
    try {
      const text = await extractTextFromFile(file);
      if (!text.trim()) { push('warning', 'No readable text found. Try a text-based PDF.'); setProcessing(null); return; }
      push('info', 'AI is processing your document…');
      const result = await callPdfProcess(upload.id, text);
      if (!result.success) { push('error', result.error ?? 'Processing failed'); setProcessing(null); return; }
      const { data: updated } = await supabase.from('pdf_uploads').select('*').eq('id', upload.id).single();
      const fresh = updated as PdfUpload;
      setUploads((u) => u.map((x) => (x.id === upload.id ? fresh : x)));
      setSelected(fresh);
      await trackEvent('pdf_upload', { filename: file.name });
      push('success', 'AI processing complete!');
    } catch (err) {
      push('error', err instanceof Error ? err.message : 'Processing failed');
    } finally {
      setProcessing(null);
    }
  }

  async function saveQuizToDB(u: PdfUpload) {
    if (!u.quiz_questions) return;
    await supabase.from('quizzes').insert({ title: u.filename.replace(/\.[^.]+$/, ''), questions: u.quiz_questions, score: 0, total: (u.quiz_questions as QuizQuestion[]).length, difficulty: 'medium' });
    push('success', 'Quiz saved to Quiz Generator');
  }

  async function saveFlashcards(u: PdfUpload) {
    if (!u.flashcard_pairs) return;
    const rows = (u.flashcard_pairs as { question: string; answer: string }[]).map((c) => ({ deck_name: u.filename.replace(/\.[^.]+$/, ''), question: c.question, answer: c.answer }));
    await supabase.from('flashcards').insert(rows);
    push('success', `${rows.length} flashcards saved`);
  }

  async function saveNote(u: PdfUpload) {
    if (!u.summary) return;
    await supabase.from('notes').insert({ title: u.filename.replace(/\.[^.]+$/, ''), content: u.extracted_text?.slice(0, 5000) ?? '', summary: u.summary, key_points: u.key_points });
    push('success', 'Note saved');
  }

  async function deleteUpload(u: PdfUpload) {
    await supabase.from('pdf_uploads').delete().eq('id', u.id);
    setUploads((arr) => arr.filter((x) => x.id !== u.id));
    if (selected?.id === u.id) setSelected(null);
    push('success', 'Deleted');
  }

  const view = selected ? (uploads.find((u) => u.id === selected.id) ?? selected) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      {/* Main */}
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">PDF Upload & AI Analysis</h1>
          <p className="text-sm text-ink-500">Upload a PDF or text file. AI generates a summary, key points, quiz questions, and flashcards.</p>
        </div>

        {/* Drop zone */}
        <label
          className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-ink-200 bg-white p-10 text-center transition hover:border-brand-400 hover:bg-brand-50/20 dark:border-ink-700 dark:bg-ink-900 dark:hover:border-brand-600"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        >
          <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md,text/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-950/40">
            <FileUp className="h-7 w-7" />
          </div>
          <div>
            <p className="font-semibold">Drop a PDF here, or click to browse</p>
            <p className="mt-0.5 text-sm text-ink-400">PDF, TXT, Markdown · up to 20 MB · up to 30 pages</p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={(e) => { e.preventDefault(); fileInputRef.current?.click(); }}>
            <Upload className="h-4 w-4" /> Choose file
          </Button>
        </label>

        {/* Result viewer */}
        {view && (
          <Card className="animate-slide-up">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-100 dark:bg-ink-800">
                  <FileText className="h-5 w-5 text-ink-500" />
                </div>
                <div>
                  <p className="font-semibold">{view.filename}</p>
                  <p className="text-xs text-ink-400">{(view.file_size / 1024).toFixed(0)} KB · {formatDate(view.created_at)}</p>
                </div>
              </div>
              <StatusBadge status={processing === view.id ? 'processing' : view.status} />
            </div>

            {processing === view.id ? (
              <div className="flex flex-col items-center gap-3 py-10">
                <div className="h-10 w-10 rounded-full border-4 border-brand-500/30 border-t-brand-500 animate-spin" />
                <p className="text-sm text-ink-500">AI is reading and analysing your document…</p>
              </div>
            ) : view.status === 'error' ? (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <p className="text-sm text-red-700 dark:text-red-300">{view.error_message ?? 'Processing failed. Try again.'}</p>
              </div>
            ) : view.status === 'done' ? (
              <>
                <div className="mb-4 flex gap-1 rounded-xl border border-ink-100 p-1 dark:border-ink-700">
                  {(['summary', 'quiz', 'flashcards'] as const).map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={cn('flex-1 rounded-lg py-2 text-xs font-semibold capitalize transition',
                        activeTab === tab ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800')}>
                      {tab}{tab === 'quiz' && view.quiz_questions ? ` (${(view.quiz_questions as QuizQuestion[]).length})` : ''}
                      {tab === 'flashcards' && view.flashcard_pairs ? ` (${(view.flashcard_pairs as { question: string; answer: string }[]).length})` : ''}
                    </button>
                  ))}
                </div>

                {activeTab === 'summary' && (
                  <div className="space-y-4">
                    {view.summary && (
                      <div className="rounded-xl bg-brand-50/60 p-4 dark:bg-brand-950/30">
                        <p className="text-sm leading-relaxed text-ink-700 dark:text-ink-200">{view.summary}</p>
                      </div>
                    )}
                    {view.key_points && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Key Points</p>
                        <ul className="space-y-1.5">
                          {view.key_points.split('\n').filter(Boolean).map((p, i) => (
                            <li key={i} className="flex gap-2 rounded-lg bg-accent-50/50 p-2.5 text-sm dark:bg-accent-950/20">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-500 text-[10px] font-bold text-white">{i + 1}</span>
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex gap-2 border-t border-ink-100 pt-3 dark:border-ink-800">
                      <Button size="sm" variant="secondary" onClick={() => saveNote(view)}><Save className="h-4 w-4" /> Save note</Button>
                      <Button size="sm" variant="secondary" onClick={() => dl(`${view.filename}-summary.txt`, `SUMMARY\n${view.summary ?? ''}\n\nKEY POINTS\n${view.key_points ?? ''}`)}><Download className="h-4 w-4" /> Download</Button>
                    </div>
                  </div>
                )}

                {activeTab === 'quiz' && (
                  <div className="space-y-3">
                    {!view.quiz_questions
                      ? <p className="text-sm text-ink-400">No quiz generated.</p>
                      : (view.quiz_questions as QuizQuestion[]).map((q, i) => (
                          <div key={i} className="rounded-xl border border-ink-100 p-4 dark:border-ink-800">
                            <p className="text-sm font-semibold">{i + 1}. {q.question}</p>
                            <ul className="mt-2 space-y-1">
                              {q.options.map((opt, j) => (
                                <li key={j} className={cn('rounded-lg px-3 py-1.5 text-xs',
                                  j === q.answer ? 'bg-accent-50 font-semibold text-accent-700 dark:bg-accent-950/30' : 'text-ink-500')}>
                                  {String.fromCharCode(65 + j)}. {opt}
                                </li>
                              ))}
                            </ul>
                            {q.explanation && <p className="mt-2 text-xs italic text-ink-400">{q.explanation}</p>}
                          </div>
                        ))}
                    {view.quiz_questions && (
                      <Button size="sm" onClick={() => saveQuizToDB(view)}><Save className="h-4 w-4" /> Save quiz</Button>
                    )}
                  </div>
                )}

                {activeTab === 'flashcards' && (
                  <div className="space-y-3">
                    {!view.flashcard_pairs
                      ? <p className="text-sm text-ink-400">No flashcards generated.</p>
                      : (
                          <>
                            <div className="grid gap-3 sm:grid-cols-2">
                              {(view.flashcard_pairs as { question: string; answer: string }[]).map((c, i) => (
                                <div key={i} className="rounded-xl border border-ink-100 p-4 dark:border-ink-800">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Q</p>
                                  <p className="text-sm font-medium">{c.question}</p>
                                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-brand-500">A</p>
                                  <p className="text-sm text-ink-600 dark:text-ink-300">{c.answer}</p>
                                </div>
                              ))}
                            </div>
                            <Button size="sm" onClick={() => saveFlashcards(view)}><Layers className="h-4 w-4" /> Save as flashcard deck</Button>
                          </>
                        )}
                  </div>
                )}
              </>
            ) : null}
          </Card>
        )}
      </div>

      {/* Sidebar: uploads list */}
      <Card className="!p-0 self-start">
        <div className="flex items-center justify-between border-b border-ink-100 p-4 dark:border-ink-800">
          <h2 className="font-display text-base font-bold">My Uploads</h2>
          <Badge color="gray">{uploads.length}</Badge>
        </div>
        <div className="max-h-[65vh] overflow-y-auto p-2">
          {loading ? (
            <div className="space-y-2 p-2">{[0,1,2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : uploads.length === 0 ? (
            <EmptyState icon={FileUp} title="No uploads yet" description="Upload your first PDF above." />
          ) : (
            uploads.map((u) => (
              <div key={u.id}
                onClick={() => setSelected(u)}
                className={cn('group cursor-pointer rounded-xl p-3 transition hover:bg-ink-50 dark:hover:bg-ink-800/50',
                  selected?.id === u.id && 'bg-brand-50 dark:bg-brand-950/30')}>
                <div className="mb-1 flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                  <p className="flex-1 truncate text-sm font-medium">{u.filename}</p>
                  <StatusBadge status={u.status} small />
                </div>
                <p className="text-[10px] text-ink-400">{formatDate(u.created_at)} · {(u.file_size / 1024).toFixed(0)} KB</p>
                <button onClick={(e) => { e.stopPropagation(); deleteUpload(u); }}
                  className="mt-1 text-[10px] text-ink-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100">
                  <Trash2 className="inline h-3 w-3 mr-0.5" />Delete
                </button>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

function StatusBadge({ status, small }: { status: PdfUpload['status'] | 'processing'; small?: boolean }) {
  const map = {
    pending:    { cls: 'bg-ink-100 text-ink-600 dark:bg-ink-800', Icon: Clock,         label: 'Pending' },
    processing: { cls: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40', Icon: RefreshCw,  label: 'Processing' },
    done:       { cls: 'bg-accent-50 text-accent-700 dark:bg-accent-950/40', Icon: CheckCircle2, label: 'Done' },
    error:      { cls: 'bg-red-50 text-red-600 dark:bg-red-950/40', Icon: AlertCircle, label: 'Error' },
  };
  const cfg = map[status] ?? map.pending;
  return (
    <span className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 font-medium', cfg.cls, small ? 'text-[10px]' : 'text-xs')}>
      <cfg.Icon className={cn('h-3 w-3', status === 'processing' && 'animate-spin')} />
      {cfg.label}
    </span>
  );
}
