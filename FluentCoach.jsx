/**
 * Fluent Coach - AI English coaching UI (front-end mockup)
 *
 * Single-file React component. Everything runs on local state and dummy data.
 * Stack: React 18 + Tailwind CSS (core utilities only) + lucide-react
 *
 * Where to plug in a real backend:
 *   -> analyzeText(text): replace the stub below with a call to your LLM API
 *      and return an object shaped like MOCK_RESULT.
 */
import { useState, useEffect } from "react";
import {
  Sparkles, PenLine, BarChart3, BookMarked, Play, Pause, Volume2, ArrowRight,
  Bookmark, BookmarkCheck, Eye, Lightbulb, Flame, RotateCcw, Loader2, Shuffle, Target, X,
} from "lucide-react";

/* ------------------------------ Dummy data ------------------------------ */

const SAMPLE =
  "Last weekend, I made a decision to go to a hiking with my friends. The weather was very good and the view was very beautiful. I felt very tired but I was really happy. I want to do it again next month.";

const PROMPTS = [
  "What was the most memorable thing that happened to you this week?",
  "Describe a small habit that has changed your daily life.",
  "Do you think remote work is here to stay? Why or why not?",
];

// {{...}} marks a filler / discourse marker so it can be highlighted.
const MOCK_RESULT = {
  score: 64,
  collocations: [
    {
      id: "c1", bad: "made a decision to go to a hiking", good: "ended up going hiking",
      why: "「make a decision to ~」は文法的に正しいが硬く、日常会話では浮きます。hiking のような活動は go + -ing で冠詞も不要。「結局〜することになった」という気軽さは ended up -ing が運びます。",
    },
    {
      id: "c2", bad: "The weather was very good", good: "We lucked out with the weather",
      why: "good は評価するだけですが、lucked out には「運よく恵まれた」という含みがあります。get great weather / be blessed with も同系統です。",
    },
    {
      id: "c3", bad: "I want to do it again", good: "I'm already itching to go again",
      why: "do it again は直訳的です。itching to ~ は「うずうずしている」という身体感覚を伴い、気持ちの強さまで伝わります。",
    },
  ],
  vocab: [
    { id: "v1", from: "very beautiful", fromLv: "B1", to: "breathtaking", toLv: "C1",
      ex: "The view from the ridge was absolutely breathtaking.",
      note: "very + 形容詞を、それ自体が強い意味を持つ形容詞1語に置き換える。" },
    { id: "v2", from: "very tired", fromLv: "B1", to: "wiped out", toLv: "C1",
      ex: "I was completely wiped out by the time we got home.",
      note: "exhausted より口語的。疲れ切って動けない感じ。" },
    { id: "v3", from: "really happy", fromLv: "B2", to: "over the moon", toLv: "C2",
      ex: "She was over the moon about the news.",
      note: "「有頂天」を表す定番イディオム。elated はよりフォーマル。" },
  ],
  script: [
    "{{So,}} last weekend I ended up going hiking with a few friends.",
    "{{And, I mean,}} we totally lucked out with the weather.",
    "The view from the top was just breathtaking, {{you know?}}",
    "I was completely wiped out by the end, but {{honestly,}} it was so worth it.",
    "{{Actually,}} I'm already itching to go again next month.",
  ],
};

const INITIAL_BANK = [
  { id: "b1", type: "collocation", en: "make a point of doing", note: "〜するよう心がける", mastery: 2 },
  { id: "b2", type: "vocab", en: "meticulous", note: "← careful", mastery: 1 },
  { id: "b3", type: "collocation", en: "pick up the tab", note: "← pay for everyone", mastery: 3 },
  { id: "b4", type: "vocab", en: "a blessing in disguise", note: "← unexpected good luck", mastery: 0 },
];

const WEAKNESS = [
  { label: "動詞と名詞のコロケーション", pct: 72 },
  { label: "very の多用（強調語）", pct: 58 },
  { label: "前置詞・冠詞の選択", pct: 41 },
  { label: "つなぎ言葉（Fillers）", pct: 35 },
];
const WEEK = [["月", 3], ["火", 5], ["水", 2], ["木", 6], ["金", 4], ["土", 0], ["日", 1]];

// TODO: replace with a real API call (e.g. POST /api/analyze) returning MOCK_RESULT's shape.
const analyzeText = () => new Promise((resolve) => setTimeout(() => resolve(MOCK_RESULT), 1400));

/* ------------------------------ Small pieces ------------------------------ */

const LEVEL = {
  B1: "border-slate-600 text-slate-400",
  B2: "border-sky-500/50 text-sky-300",
  C1: "border-amber-400/50 text-amber-300",
  C2: "border-fuchsia-400/50 text-fuchsia-300",
};
const Level = ({ lv }) => (
  <span className={`rounded border px-1.5 py-0.5 text-xs font-medium ${LEVEL[lv]}`}>{lv}</span>
);

const Panel = ({ icon: Icon, title, sub, right, children }) => (
  <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-slate-800 p-2 text-amber-300"><Icon size={16} /></div>
        <div>
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          <p className="text-xs text-slate-500">{sub}</p>
        </div>
      </div>
      {right}
    </div>
    {children}
  </section>
);

const SaveBtn = ({ saved, onClick }) => (
  <button
    onClick={onClick}
    disabled={saved}
    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition ${
      saved ? "text-amber-300" : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
    }`}
  >
    {saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
    {saved ? "単語帳に保存済み" : "単語帳に保存"}
  </button>
);

function CollocationCard({ c, recall, saved, onSave }) {
  const [open, setOpen] = useState(false);
  const show = !recall || open;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3">
          <div className="mb-1 text-xs font-medium text-rose-300">❌ 不自然</div>
          <p className="font-serif text-base text-rose-100 line-through decoration-rose-400/60">{c.bad}</p>
        </div>
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
          <div className="mb-1 text-xs font-medium text-emerald-300">⭕️ 自然</div>
          {show ? (
            <p className="font-serif text-base text-emerald-100">{c.good}</p>
          ) : (
            <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-sm text-emerald-300 hover:text-emerald-100">
              <Eye size={14} /> 先に自分で言い換えて、答えを見る
            </button>
          )}
        </div>
      </div>
      {show && <p className="mt-3 text-xs leading-relaxed text-slate-400">{c.why}</p>}
      <div className="mt-2 flex justify-end">
        <SaveBtn saved={saved} onClick={() => onSave({ type: "collocation", en: c.good, note: `← ${c.bad}` })} />
      </div>
    </div>
  );
}

function VocabCard({ v, recall, saved, onSave }) {
  const [open, setOpen] = useState(false);
  const show = !recall || open;
  return (
    <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Level lv={v.fromLv} /> <span className="font-serif">{v.from}</span>
      </div>
      <ArrowRight size={14} className="my-2 text-slate-600" />
      {show ? (
        <>
          <div className="flex items-center gap-2">
            <Level lv={v.toLv} />
            <span className="font-serif text-xl text-slate-50">{v.to}</span>
          </div>
          <p className="mt-3 font-serif text-sm italic leading-relaxed text-slate-300">{v.ex}</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">{v.note}</p>
        </>
      ) : (
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-left text-sm text-amber-300 hover:text-amber-200">
          <Eye size={14} /> 1語で言い換えてみて、答えを見る
        </button>
      )}
      <div className="mt-auto flex justify-end pt-2">
        <SaveBtn saved={saved} onClick={() => onSave({ type: "vocab", en: v.to, note: `← ${v.from}` })} />
      </div>
    </div>
  );
}

const renderLine = (s) =>
  s.split(/(\{\{.*?\}\})/).filter(Boolean).map((p, i) =>
    p.startsWith("{{") ? (
      <mark key={i} className="rounded bg-amber-300/15 px-1 text-amber-200">{p.slice(2, -2)}</mark>
    ) : (
      <span key={i}>{p}</span>
    )
  );

// Playback is a UI mock: a timer walks through the lines. Swap in Web Speech API / TTS here.
function ShadowingScript({ lines }) {
  const [cur, setCur] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (!playing) return;
    if (cur >= lines.length) { setPlaying(false); setCur(-1); return; }
    const t = setTimeout(() => setCur((c) => c + 1), 2400 / speed);
    return () => clearTimeout(t);
  }, [playing, cur, speed, lines.length]);

  const toggle = () => { if (playing) setPlaying(false); else { setCur(Math.max(cur, 0)); setPlaying(true); } };
  const progress = cur < 0 ? 0 : Math.min(100, ((cur + 1) / lines.length) * 100);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3">
        <button
          onClick={toggle}
          aria-label={playing ? "一時停止" : "再生"}
          className="rounded-full bg-amber-300 p-2.5 text-slate-950 transition hover:bg-amber-200"
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <div className="h-1.5 min-w-24 flex-1 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full bg-amber-300 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex gap-1">
          {[0.75, 1, 1.25].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`rounded-md px-2 py-1 text-xs ${speed === s ? "bg-slate-700 text-slate-50" : "text-slate-500 hover:text-slate-200"}`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1">
        {lines.map((l, i) => (
          <button
            key={i}
            onClick={() => { setCur(i); setPlaying(true); }}
            className={`group flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition ${
              cur === i ? "bg-slate-800" : "hover:bg-slate-800/50"
            }`}
          >
            <Volume2 size={14} className={`mt-2 shrink-0 ${cur === i ? "text-amber-300" : "text-slate-600 group-hover:text-slate-400"}`} />
            <span className={`font-serif text-lg leading-relaxed ${cur === i ? "text-slate-50" : "text-slate-300"}`}>{renderLine(l)}</span>
          </button>
        ))}
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <mark className="rounded bg-amber-300/15 px-1 text-amber-200">黄色</mark>
        はつなぎ言葉。文の頭や間で、考える時間を稼ぐための表現です。
      </p>
    </div>
  );
}

/* ------------------------------ Insights tab ------------------------------ */

function Insights({ bank, setBank }) {
  const [filter, setFilter] = useState("all");
  const items = bank.filter((b) => filter === "all" || b.type === filter);
  const mastered = bank.filter((b) => b.mastery === 3).length;
  const cycle = (id) => setBank((b) => b.map((x) => (x.id === id ? { ...x, mastery: (x.mastery + 1) % 4 } : x)));
  const maxWeek = Math.max(...WEEK.map((w) => w[1]));

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <div className="space-y-5 lg:col-span-2">
        <div className="grid grid-cols-3 gap-3">
          {[
            ["保存した表現", bank.length, BookMarked],
            ["定着済み", mastered, Target],
            ["連続学習日数", 6, Flame],
          ].map(([label, n, Icon]) => (
            <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <Icon size={16} className="text-amber-300" />
              <div className="mt-3 font-serif text-3xl text-slate-50">{n}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          ))}
        </div>

        <Panel icon={BarChart3} title="弱点分析" sub="直近の添削で指摘が多かった項目">
          <div className="space-y-4">
            {WEAKNESS.map((w) => (
              <div key={w.label}>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-slate-300">{w.label}</span>
                  <span className="text-slate-500">{w.pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-rose-400" style={{ width: `${w.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 border-t border-slate-800 pt-4">
            <p className="mb-3 text-xs text-slate-500">今週の練習回数</p>
            <div className="flex h-24 items-end gap-2">
              {WEEK.map(([d, n]) => (
                <div key={d} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex h-16 w-full items-end">
                    <div className="w-full rounded-t bg-amber-300" style={{ height: `${(n / maxWeek) * 100}%`, minHeight: n ? 4 : 0 }} />
                  </div>
                  <span className="text-xs text-slate-500">{d}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <div className="lg:col-span-3">
        <Panel
          icon={BookMarked}
          title="マイ単語帳"
          sub="行をクリックすると定着度が変わります"
          right={
            <div className="flex gap-1">
              {[["all", "すべて"], ["collocation", "コロケーション"], ["vocab", "語彙"]].map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={`rounded-md px-2.5 py-1 text-xs ${filter === k ? "bg-slate-700 text-slate-50" : "text-slate-500 hover:text-slate-200"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          }
        >
          <ul className="divide-y divide-slate-800">
            {items.map((b) => (
              <li key={b.id}>
                <button onClick={() => cycle(b.id)} className="flex w-full items-center justify-between gap-4 py-3 text-left hover:bg-slate-800/40">
                  <div>
                    <div className="font-serif text-lg text-slate-100">{b.en}</div>
                    <div className="text-xs text-slate-500">{b.note}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5" title="定着度">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < b.mastery ? "bg-emerald-400" : "bg-slate-700"}`} />
                    ))}
                  </div>
                </button>
              </li>
            ))}
            {items.length === 0 && <li className="py-8 text-center text-sm text-slate-500">まだありません。添削結果から保存してみましょう。</li>}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------------ App ------------------------------ */

export default function FluentCoach() {
  const [tab, setTab] = useState("workspace");
  const [text, setText] = useState(SAMPLE);
  const [promptIdx, setPromptIdx] = useState(0);
  const [status, setStatus] = useState("done"); // "idle" | "loading" | "done"
  const [result, setResult] = useState(MOCK_RESULT);
  const [recall, setRecall] = useState(false);
  const [bank, setBank] = useState(INITIAL_BANK);
  const [showGuide, setShowGuide] = useState(true);

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const isSaved = (en) => bank.some((b) => b.en === en);
  const save = (item) =>
    setBank((b) => (b.some((x) => x.en === item.en) ? b : [{ id: `${Date.now()}-${item.en}`, mastery: 0, ...item }, ...b]));

  const run = async () => {
    if (!words || status === "loading") return;
    setStatus("loading");
    setResult(await analyzeText(text));
    setStatus("done");
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-amber-300 p-1.5 text-slate-950"><Sparkles size={16} /></div>
            <span className="font-serif text-lg text-slate-50">Fluent Coach</span>
          </div>
          <nav className="flex gap-1">
            {[["workspace", "Workspace", PenLine], ["insights", "Insights", BarChart3]].map(([k, l, Icon]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition ${
                  tab === k ? "bg-slate-800 text-slate-50" : "text-slate-500 hover:text-slate-200"
                }`}
              >
                <Icon size={15} /> {l}
                {k === "insights" && <span className="rounded-full bg-slate-700 px-1.5 text-xs text-slate-300">{bank.length}</span>}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {tab === "insights" ? (
          <Insights bank={bank} setBank={setBank} />
        ) : (
          <>
            {showGuide && (
              <div className="mb-5 flex items-start justify-between gap-4 rounded-2xl border border-amber-300/30 bg-amber-300/5 p-4">
                <div>
                  <p className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-200">
                    <Lightbulb size={15} /> はじめての使い方
                  </p>
                  <ol className="list-inside list-decimal space-y-1 text-sm text-slate-300">
                    <li>左のエディタに英文を書く（サンプルを入れてあります）</li>
                    <li>「添削・分析を実行」を押す</li>
                    <li>Active Recall をオンにして、答えを見る前に自分で言い直す</li>
                    <li>Shadowing Script を声に出して真似る</li>
                  </ol>
                  <p className="mt-2 text-xs text-slate-500">これはモックアップです。分析結果は固定のダミーデータです。</p>
                </div>
                <button onClick={() => setShowGuide(false)} aria-label="閉じる" className="rounded-md p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200">
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="grid gap-5 lg:grid-cols-5">
              {/* Output Workspace */}
              <div className="lg:col-span-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 lg:sticky lg:top-20">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">今日のお題</p>
                      <p className="mt-1 font-serif text-base leading-snug text-slate-100">{PROMPTS[promptIdx]}</p>
                    </div>
                    <button
                      onClick={() => setPromptIdx((i) => (i + 1) % PROMPTS.length)}
                      aria-label="お題を変える"
                      className="rounded-md p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-200"
                    >
                      <Shuffle size={15} />
                    </button>
                  </div>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Write the way you would say it out loud..."
                    className="h-64 w-full resize-none rounded-xl border border-slate-800 bg-slate-950 p-4 font-serif text-base leading-relaxed text-slate-100 placeholder-slate-600 focus:border-amber-300/60 focus:outline-none"
                  />
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-slate-500">{words} words</span>
                    <button onClick={() => setText(SAMPLE)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-200">
                      <RotateCcw size={12} /> サンプルに戻す
                    </button>
                  </div>
                  <button
                    onClick={run}
                    disabled={!words || status === "loading"}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {status === "loading" ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {status === "loading" ? "分析しています" : "添削・分析を実行"}
                  </button>
                </div>
              </div>

              {/* AI Coaching Result */}
              <div className="space-y-5 lg:col-span-3">
                {status === "loading" ? (
                  <div className="space-y-5">
                    {[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl border border-slate-800 bg-slate-900" />)}
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                      <div className="min-w-48 flex-1">
                        <div className="mb-2 flex items-baseline justify-between">
                          <span className="text-sm text-slate-300">自然さスコア</span>
                          <span className="font-serif text-xl text-slate-50">{result.score}<span className="text-sm text-slate-500"> / 100</span></span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                          <div className="h-full rounded-full bg-amber-300" style={{ width: `${result.score}%` }} />
                        </div>
                      </div>
                      <button
                        onClick={() => setRecall((r) => !r)}
                        aria-pressed={recall}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                          recall ? "border-amber-300/60 bg-amber-300/10 text-amber-200" : "border-slate-700 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <Eye size={15} /> Active Recall {recall ? "オン" : "オフ"}
                      </button>
                    </div>

                    <Panel icon={Target} title="Collocation Audit" sub="文法は合っているが、ネイティブは言わない組み合わせ">
                      <div className="space-y-3">
                        {result.collocations.map((c) => (
                          <CollocationCard key={c.id} c={c} recall={recall} saved={isSaved(c.good)} onSave={save} />
                        ))}
                      </div>
                    </Panel>

                    <Panel icon={Sparkles} title="Vocabulary Level-up" sub="B1〜B2の語を、C1〜C2の表現へ">
                      <div className="grid gap-3 sm:grid-cols-3">
                        {result.vocab.map((v) => (
                          <VocabCard key={v.id} v={v} recall={recall} saved={isSaved(v.to)} onSave={save} />
                        ))}
                      </div>
                    </Panel>

                    <Panel icon={Volume2} title="Shadowing Script" sub="あなたの伝えたかったことを、話し言葉に書き換えました">
                      <ShadowingScript lines={result.script} />
                    </Panel>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
