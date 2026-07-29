import { useEffect, useState } from 'react';
import {
  BookOpen,
  Copy,
  Download,
  FileText,
  KeyRound,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { supabase, type Note } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { useSubjects } from '../../lib/use-subjects';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Input';
import { Card, EmptyState, Skeleton, Badge } from '../../components/ui';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { download, formatDate, formatRelative } from '../../lib/utils';
import { keyPoints, summarize } from '../../lib/ai';

const SAMPLE_TEXT = `Photosynthesis is the process by which green plants, algae, and some bacteria convert light energy into chemical energy stored in glucose. The process occurs primarily in the chloroplasts, which contain a green pigment called chlorophyll that absorbs light, mostly in the blue and red wavelengths. Photosynthesis happens in two main stages: the light-dependent reactions and the Calvin cycle. The light-dependent reactions take place in the thylakoid membranes and convert solar energy into chemical energy in the form of ATP and NADPH, while releasing oxygen as a byproduct. The Calvin cycle occurs in the stroma and uses the ATP and NADPH to fix carbon dioxide into glucose. The overall equation is: 6CO2 + 6H2O + light energy produces C6H12O6 + 6O2. Factors that affect the rate of photosynthesis include light intensity, carbon dioxide concentration, temperature, and water availability. Without photosynthesis, most life on Earth would not be possible, as it provides the oxygen we breathe and the energy base for nearly every food chain.`;

export function NotesSummarizer() {
  const { user } = useAuth();
  const { push } = useToast();
  const { subjects } = useSubjects();

  const [notes, setNotes] = useState<Note[]>([]);
  const [selected, setSelected] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);

  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [summary, setSummary] = useState('');
  const [points, setPoints] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('notes').select('*').order('created_at', { ascending: false });
      setNotes((data as Note[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  function onUpload(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      push('warning', 'File too large. Paste text instead for files over 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? '');
      setText(content);
      setTitle(file.name.replace(/\.[^.]+$/, ''));
      push('success', `Loaded "${file.name}" (${content.length.toLocaleString()} chars)`);
    };
    reader.onerror = () => push('error', 'Could not read file');
    reader.readAsText(file);
  }

  async function generate() {
    if (text.trim().length < 50) { push('warning', 'Please paste at least 50 characters of text.'); return; }
    setGenerating(true);
    setSummary('');
    setPoints([]);
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 700));
    setSummary(summarize(text, 3));
    setPoints(keyPoints(text, 5));
    setGenerating(false);
    push('success', 'Generated summary and key points');
  }

  async function save() {
    if (!user) return;
    if (!title.trim()) { push('warning', 'Add a title first'); return; }
    if (!summary) { push('warning', 'Generate a summary first'); return; }
    setSaving(true);
    const { data, error } = await supabase
      .from('notes')
      .insert({ user_id: user.id, subject_id: subjectId || null, title: title.trim(), content: text, summary, key_points: points.join('\n') })
      .select()
      .single();
    setSaving(false);
    if (error) { push('error', 'Could not save note'); return; }
    setNotes((n) => [data as Note, ...n]);
    push('success', 'Note saved');
    reset();
  }

  function reset() {
    setText(''); setTitle(''); setSubjectId(''); setSummary(''); setPoints([]);
  }

  async function deleteNote(n: Note) {
    await supabase.from('notes').delete().eq('id', n.id);
    setNotes((arr) => arr.filter((x) => x.id !== n.id));
    if (selected?.id === n.id) setSelected(null);
    push('success', 'Note deleted');
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    push('success', 'Copied');
  }

  const activeNote = selected ? notes.find((n) => n.id === selected.id) ?? selected : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Editor */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Notes Summarizer</h1>
            <p className="text-sm text-ink-500">Paste text or upload a file to generate summaries & key points.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setText(SAMPLE_TEXT); setTitle('Photosynthesis — sample'); push('info','Loaded sample text'); }}>
            <FileText className="h-4 w-4" /> Load sample
          </Button>
        </div>

        <Card>
          <Input label="Title" placeholder="e.g. Chapter 5 — Photosynthesis" value={title} onChange={(e) => setTitle(e.target.value)} />

          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-300">Subject</label>
            <div className="flex flex-wrap gap-2">
              {subjects.length === 0 ? (
                <p className="text-xs text-ink-400">Add subjects from the dashboard to organize notes.</p>
              ) : (
                subjects.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSubjectId(s.id)}
                    className={`chip ${subjectId === s.id ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300'}`}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                    {s.subject_name}
                  </button>
                ))
              )}
            </div>
          </div>
        </Card>

        {/* Upload zone */}
        <label
          className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink-200 bg-white p-8 text-center transition hover:border-brand-400 hover:bg-brand-50/30 dark:border-ink-700 dark:bg-ink-900 dark:hover:border-brand-600 dark:hover:bg-brand-950/20"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onUpload(f); }}
        >
          <input type="file" accept=".txt,.md,.csv,text/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
          <Upload className="mb-2 h-8 w-8 text-ink-400" />
          <p className="text-sm font-medium">Upload .txt or paste text below</p>
          <p className="mt-1 text-xs text-ink-400">For PDFs/DOCX, copy-paste the text into the editor</p>
        </label>

        <Card>
          <Textarea
            placeholder="Paste your study material here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-ink-400">{text.length.toLocaleString()} characters</span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={reset} disabled={!text && !summary}>Clear</Button>
              <Button onClick={generate} loading={generating}>
                <Sparkles className="h-4 w-4" /> Summarize
              </Button>
            </div>
          </div>
        </Card>

        {/* Generated output */}
        {(generating || summary) && (
          <Card className="animate-slide-up">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-500" />
              <h2 className="font-display text-lg font-bold">Generated summary</h2>
              <Badge color="brand" className="ml-auto">AI</Badge>
            </div>

            {generating ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}</div>
            ) : (
              <>
                <div className="rounded-xl bg-brand-50/60 p-4 dark:bg-brand-950/30">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm leading-relaxed text-ink-700 dark:text-ink-200">{summary}</p>
                    <button onClick={() => copy(summary)} className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800"><Copy className="h-3.5 w-3.5" /></button>
                  </div>
                </div>

                {points.length > 0 && (
                  <div className="mt-5">
                    <div className="mb-2 flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-accent-500" />
                      <h3 className="font-semibold text-sm">Key points</h3>
                    </div>
                    <ul className="space-y-2">
                      {points.map((p, i) => (
                        <li key={i} className="flex gap-2 rounded-lg bg-accent-50/50 p-2.5 dark:bg-accent-950/20">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-500 text-[10px] font-bold text-white">{i + 1}</span>
                          <span className="text-sm text-ink-700 dark:text-ink-200">{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-5 flex gap-2 border-t border-ink-100 pt-4 dark:border-ink-800">
                  <Button variant="secondary" size="sm" onClick={() => download(`${title || 'summary'}.txt`, `SUMMARY\n${summary}\n\nKEY POINTS\n${points.map((p, i) => `${i + 1}. ${p}`).join('\n')}`)}>
                    <Download className="h-4 w-4" /> Download
                  </Button>
                  <Button size="sm" onClick={save} loading={saving}>
                    <Save className="h-4 w-4" /> Save note
                  </Button>
                </div>
              </>
            )}
          </Card>
        )}
      </div>

      {/* Saved notes list */}
      <div>
        <Card className="!p-0">
          <div className="flex items-center justify-between border-b border-ink-100 p-4 dark:border-ink-800">
            <h2 className="font-display text-lg font-bold">Saved notes</h2>
            <Badge color="gray">{notes.length}</Badge>
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-2">
            {loading ? (
              <div className="space-y-2 p-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
            ) : notes.length === 0 ? (
              <EmptyState icon={BookOpen} title="No notes yet" description="Generate and save a summary to see it here." />
            ) : (
              notes.map((n) => (
                <div key={n.id} className="group rounded-xl p-3 transition hover:bg-ink-50 dark:hover:bg-ink-800/50">
                  <button onClick={() => setSelected(n)} className="block w-full text-left">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <p className="font-medium text-sm text-ink-800 dark:text-ink-100">{n.title}</p>
                      <span className="shrink-0 text-[10px] text-ink-400">{formatRelative(n.created_at)}</span>
                    </div>
                    <p className="line-clamp-2 text-xs text-ink-500">{n.summary ?? n.content.slice(0, 100)}</p>
                    {n.key_points && <Badge color="brand" className="mt-2">{n.key_points.split('\n').length} key points</Badge>}
                  </button>
                  <button onClick={() => deleteNote(n)} className="mt-2 text-[10px] text-ink-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100">
                    <Trash2 className="inline h-3 w-3" /> Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Viewer modal */}
      <Modal open={!!activeNote} onClose={() => setSelected(null)} title={activeNote?.title} size="lg">
        {activeNote && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-ink-400">
              <Badge color="gray">{formatDate(activeNote.created_at)}</Badge>
              {activeNote.summary && <Badge color="brand">Summary</Badge>}
            </div>
            {activeNote.summary && (
              <div className="rounded-xl bg-brand-50/60 p-4 dark:bg-brand-950/30">
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">Summary</h4>
                <p className="text-sm leading-relaxed text-ink-700 dark:text-ink-200">{activeNote.summary}</p>
              </div>
            )}
            {activeNote.key_points && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Key points</h4>
                <ul className="space-y-1.5">
                  {activeNote.key_points.split('\n').map((p, i) => (
                    <li key={i} className="flex gap-2 rounded-lg bg-accent-50/50 p-2 text-sm dark:bg-accent-950/20">
                      <span className="font-semibold text-accent-600">{i + 1}.</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Original content</h4>
              <p className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-xl bg-ink-50 p-3 text-sm text-ink-600 dark:bg-ink-800 dark:text-ink-300">{activeNote.content}</p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => copy(activeNote.summary ?? activeNote.content)}><Copy className="h-4 w-4" /> Copy</Button>
              <Button variant="secondary" size="sm" onClick={() => download(`${activeNote.title}.txt`, activeNote.content)}><Download className="h-4 w-4" /> Download</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export { Plus };
