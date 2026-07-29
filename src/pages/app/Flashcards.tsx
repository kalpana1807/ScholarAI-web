import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  Layers,
  Plus,
  RefreshCw,
  Save,
  Shuffle,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { supabase, type Flashcard, type Note } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { useSubjects } from '../../lib/use-subjects';
import { Button } from '../../components/ui/Button';
import { Card, EmptyState, Badge } from '../../components/ui';
import { Textarea } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { cn, uid } from '../../lib/utils';
import { generateFlashcards } from '../../lib/ai';

export function Flashcards() {
  const { user } = useAuth();
  const { push } = useToast();
  const { subjects } = useSubjects();

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Generator
  const [sourceText, setSourceText] = useState('');
  const [preview, setPreview] = useState<{ id: string; question: string; answer: string }[]>([]);
  const [deckName, setDeckName] = useState('General');
  const [subjectId, setSubjectId] = useState('');

  // Review mode
  const [reviewing, setReviewing] = useState(false);
  const [reviewCards, setReviewCards] = useState<Flashcard[]>([]);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [c, n] = await Promise.all([
        supabase.from('flashcards').select('*').order('created_at', { ascending: false }),
        supabase.from('notes').select('*').order('created_at', { ascending: false }).limit(8),
      ]);
      setCards((c.data as Flashcard[]) ?? []);
      setNotes((n.data as Note[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  async function generate() {
    if (sourceText.trim().length < 80) { push('warning', 'Paste at least 80 characters to generate flashcards.'); return; }
    setGenerating(true);
    setPreview([]);
    await new Promise((r) => setTimeout(r, 700 + Math.random() * 600));
    const generated = generateFlashcards(sourceText, 8);
    setPreview(generated.map((g) => ({ id: uid(), ...g })));
    setGenerating(false);
    if (generated.length === 0) push('warning', 'Could not generate flashcards. Try richer content.');
    else push('success', `Generated ${generated.length} flashcards`);
  }

  async function saveCards() {
    if (!user || preview.length === 0) return;
    setSaving(true);
    const rows = preview.map((c) => ({
      user_id: user.id,
      subject_id: subjectId || null,
      deck_name: deckName || 'General',
      question: c.question,
      answer: c.answer,
    }));
    const { data, error } = await supabase.from('flashcards').insert(rows).select();
    setSaving(false);
    if (error) { push('error', 'Could not save'); return; }
    setCards((c) => [...(data as Flashcard[]), ...c]);
    setPreview([]);
    setSourceText('');
    push('success', `Saved ${rows.length} cards to "${deckName}"`);
  }

  function removePreview(id: string) {
    setPreview((p) => p.filter((c) => c.id !== id));
  }

  async function deleteCard(card: Flashcard) {
    await supabase.from('flashcards').delete().eq('id', card.id);
    setCards((c) => c.filter((x) => x.id !== card.id));
    if (reviewCards.some((x) => x.id === card.id)) {
      setReviewCards((rc) => rc.filter((x) => x.id !== card.id));
    }
  }

  function startReview(filterDeck?: string) {
    const set = filterDeck ? cards.filter((c) => c.deck_name === filterDeck) : cards;
    if (set.length === 0) { push('warning', 'No cards to review.'); return; }
    const shuffled = [...set].sort(() => Math.random() - 0.5);
    setReviewCards(shuffled);
    setReviewIdx(0);
    setFlipped(false);
    setReviewing(true);
  }

  function nextCard() {
    setFlipped(false);
    setReviewIdx((i) => (i + 1) % reviewCards.length);
  }
  function prevCard() {
    setFlipped(false);
    setReviewIdx((i) => (i - 1 + reviewCards.length) % reviewCards.length);
  }

  const decks = Array.from(new Set(cards.map((c) => c.deck_name)));
  const activeCard = reviewCards[reviewIdx];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Flashcards</h1>
          <p className="text-sm text-ink-500">Generate decks from notes and review with flip animation.</p>
        </div>
        {decks.length > 0 && (
          <Button onClick={() => startReview()}>
            <Sparkles className="h-4 w-4" /> Review all
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {/* Generator */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Generate flashcards</h2>
              <Button variant="ghost" size="sm" onClick={() => setSourceText(sampleText())}>
                <Plus className="h-4 w-4" /> Sample
              </Button>
            </div>
            <Textarea rows={5} placeholder="Paste text or notes to auto-generate flashcards…" value={sourceText} onChange={(e) => setSourceText(e.target.value)} />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {notes.map((n) => (
                <button key={n.id} onClick={() => setSourceText(n.content)} className="chip bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300">
                  <BrainCircuit className="h-3 w-3" /> {n.title}
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Input label="Deck name" placeholder="e.g. Chemistry Ch.3" value={deckName} onChange={(e) => setDeckName(e.target.value)} />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-300">Subject</label>
                <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="input-base">
                  <option value="">No subject</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                </select>
              </div>
            </div>
            <Button className="mt-4 w-full" onClick={generate} loading={generating}>
              <Sparkles className="h-4 w-4" /> Generate flashcards
            </Button>
          </Card>

          {/* Preview */}
          {preview.length > 0 && (
            <Card className="animate-slide-up">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">Preview ({preview.length})</h2>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setPreview([])}>Discard</Button>
                  <Button size="sm" onClick={saveCards} loading={saving}><Save className="h-4 w-4" /> Save deck</Button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {preview.map((c) => (
                  <div key={c.id} className="group relative rounded-xl border border-ink-100 p-4 dark:border-ink-800">
                    <button onClick={() => removePreview(c.id)} className="absolute right-2 top-2 rounded-md p-1 text-ink-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Q</p>
                    <p className="text-sm font-medium text-ink-800 dark:text-ink-100">{c.question}</p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-brand-500">A</p>
                    <p className="text-sm text-ink-600 dark:text-ink-300">{c.answer}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Cards list */}
          <Card className="!p-0">
            <div className="border-b border-ink-100 p-4 dark:border-ink-800">
              <h2 className="font-display text-lg font-bold">All flashcards ({cards.length})</h2>
            </div>
            {loading ? (
              <div className="p-4 text-sm text-ink-400">Loading…</div>
            ) : cards.length === 0 ? (
              <EmptyState icon={Layers} title="No flashcards yet" description="Generate cards from your notes or paste text above." />
            ) : (
              <div className="max-h-[50vh] overflow-y-auto p-3">
                <div className="space-y-2">
                  {cards.map((c) => (
                    <div key={c.id} className="group flex items-center gap-3 rounded-xl border border-ink-100 p-3 dark:border-ink-800">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.question}</p>
                        <p className="truncate text-xs text-ink-500">{c.answer}</p>
                      </div>
                      <Badge color="gray">{c.deck_name}</Badge>
                      <button onClick={() => deleteCard(c)} className="text-ink-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Decks sidebar */}
        <div className="space-y-3">
          <Card>
            <h2 className="mb-3 font-display text-base font-bold">Decks</h2>
            {decks.length === 0 ? (
              <p className="text-xs text-ink-400">Save flashcards to build decks.</p>
            ) : (
              <div className="space-y-2">
                {decks.map((d) => {
                  const count = cards.filter((c) => c.deck_name === d).length;
                  return (
                    <div key={d} className="flex items-center justify-between rounded-xl border border-ink-100 p-3 dark:border-ink-800">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400"><Layers className="h-4 w-4" /></div>
                        <div>
                          <p className="text-sm font-medium">{d}</p>
                          <p className="text-[10px] text-ink-400">{count} cards</p>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => startReview(d)}><ArrowRight className="h-4 w-4" /></Button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Review modal */}
      <Modal open={reviewing} onClose={() => setReviewing(false)} size="lg">
        {activeCard && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <Badge color="brand">Card {reviewIdx + 1} of {reviewCards.length}</Badge>
              <Button size="icon" variant="ghost" onClick={() => setReviewing(false)}><span className="text-xs">Close</span></Button>
            </div>

            {/* Flip card */}
            <div className="perspective-1000 mx-auto h-64 w-full max-w-md cursor-pointer" onClick={() => setFlipped((f) => !f)}>
              <div className={cn('relative h-full w-full transform-style-3d transition-transform duration-500', flipped && 'rotate-y-180')}>
                {/* Front */}
                <div className={cn('backface-hidden absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-2 border-brand-200 bg-white p-6 text-center dark:border-brand-900 dark:bg-ink-900')}>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-400">Question</p>
                  <p className="font-display text-lg font-semibold text-ink-900 dark:text-ink-50">{activeCard.question}</p>
                  <p className="absolute bottom-3 text-[10px] text-ink-400">Click to flip</p>
                </div>
                {/* Back */}
                <div className={cn('backface-hidden rotate-y-180 absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-2 border-accent-200 bg-accent-50 p-6 text-center dark:border-accent-900 dark:bg-accent-950/30')}>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-accent-500">Answer</p>
                  <p className="font-display text-lg font-semibold text-accent-800 dark:text-accent-200">{activeCard.answer}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <Button variant="ghost" onClick={prevCard}><ChevronLeft className="h-4 w-4" /> Prev</Button>
              <Button variant="secondary" onClick={() => setFlipped((f) => !f)}><RefreshCw className="h-4 w-4" /> Flip</Button>
              <Button onClick={nextCard}>Next <ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function sampleText(): string {
  return `The water cycle describes the continuous movement of water on, above, and below the Earth's surface. Evaporation is the process where water changes from liquid to gas, primarily from oceans, lakes, and rivers, driven by solar energy. Condensation occurs when water vapor cools and forms clouds. Precipitation is when water falls back to Earth as rain, snow, sleet, or hail. Collection is when water gathers in oceans, lakes, rivers, and groundwater. Transpiration is the release of water vapor from plants into the atmosphere. Infiltration is the process by which water soaks into the ground. The sun is the primary energy source that drives the water cycle.`;
}

export { Shuffle, Upload };
