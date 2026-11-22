/**
 * Fluent Coach - AI English coaching UI (front-end mockup)
 *
 * Single-file React component. Runs entirely in the browser: a rule-based analyzer
 * (COLLOCATION_RULES / UPGRADES below) checks whatever you type. No API key needed.
 * Stack: React 18 + Tailwind CSS (core utilities only) + lucide-react
 * Design: editorial, square-cornered, hairline rules, heavy type on warm grey paper.
 *
 * Where to plug in a real backend:
 *   -> set API_ENDPOINT to a backend that wraps an LLM. It receives POST { text }
 *      and must return the same shape as analyzeLocal().
 */
import { useState, useEffect } from "react";
import { Play, Pause, Eye, Loader2, Shuffle, RotateCcw } from "lucide-react";

/* ------------------------------ Dummy data ------------------------------ */

const SAMPLE =
  "Last weekend, I made a decision to go to a hiking with my friends. The weather was very good and the view was very beautiful. I felt very tired but I was really happy. I want to do it again next month.";

const PROMPTS = [
  "What was the most memorable thing that happened to you this week?",
  "Describe a small habit that has changed your daily life.",
  "Do you think remote work is here to stay? Why or why not?",
];

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

/* ------------------------------ Analyzer ------------------------------ */

// Optional: URL of your own backend that wraps an LLM. It receives POST { text } and must
// return the same shape as analyzeLocal(). Leave empty to use the built-in rules below.
const API_ENDPOINT = "";

const MAX_COLLOCATIONS = 4;
const MAX_VOCAB = 3;

// [pattern, natural replacement ($1, $2 allowed), explanation]
const COLLOCATION_RULES = [
  [/\b(?:made|make|makes|making) a decision to\b/i, "decided to", "「make a decision to ~」は文法的には正しいものの硬い言い方です。会話では decide to ~ の1語で済ませるのが自然です。"],
  [/\b(go|goes|going|went) to (?:a |an |the )?(hiking|shopping|swimming|fishing|camping|skiing|jogging|cycling|running)\b/i, "$1 $2", "hiking や shopping のような活動は go + -ing で表し、to も冠詞も付けません。"],
  [/\bthe weather (?:was|is) (?:very |really )?(?:good|nice)\b/i, "we got great weather", "good は評価を述べるだけです。get great weather なら「天気に恵まれた」という運のニュアンスまで伝わります。"],
  [/\bdo (?:a |some )?mistakes?\b/i, "make a mistake", "mistake は do ではなく make と結びつきます。"],
  [/\bmake (?:my |the )?homework\b/i, "do my homework", "homework は make ではなく do と結びつきます。"],
  [/\bsay (?:a )?jokes?\b/i, "tell a joke", "joke は say ではなく tell と結びつきます。"],
  [/\bopen (?:a )?party\b/i, "throw a party", "パーティーを「開く」は open ではなく throw / have を使います。"],
  [/\beat (?:a |the )?medicine\b/i, "take medicine", "薬は eat ではなく take を使います。"],
  [/\btake (?:a )?rest\b/i, "take a break", "take a rest は不自然に響きます。休憩は take a break、休養は get some rest です。"],
  [/\b(?:big|strong) (rain|snow)\b/i, "heavy $1", "雨や雪の強さは big / strong ではなく heavy で表します。"],
];

// adjective -> [upgrade, level, example, note]. Matched after very / really / so / extremely / pretty.
const UPGRADES = {
  beautiful: ["breathtaking", "C1", "The view from the ridge was absolutely breathtaking.", "very + 形容詞を、強い意味を持つ形容詞1語に置き換える。"],
  tired: ["wiped out", "C1", "I was completely wiped out by the time we got home.", "exhausted より口語的。疲れ切って動けない感じ。"],
  happy: ["over the moon", "C2", "She was over the moon about the news.", "「有頂天」を表す定番イディオム。"],
  good: ["outstanding", "C1", "The service was outstanding.", "good を強めるより、1語で言い切るほうが引き締まる。"],
  big: ["massive", "C1", "We have a massive deadline next week.", "huge より、くだけた場面でも書き言葉でも使いやすい。"],
  important: ["crucial", "C1", "Sleep is crucial for memory.", "important よりも「決定的」という響きが強い。"],
  difficult: ["daunting", "C1", "The task felt daunting at first.", "「気が遠くなるほど難しい」という心理面を含む。"],
  hard: ["grueling", "C2", "It was a grueling week at work.", "体力や気力を削られる大変さ。"],
  interesting: ["fascinating", "C1", "I found the lecture fascinating.", "引き込まれる感覚を含む。"],
  surprised: ["taken aback", "C1", "I was taken aback by her answer.", "予想外で一瞬言葉に詰まる驚き。"],
  angry: ["furious", "C1", "He was furious about the delay.", "very angry の代わりに1語で。"],
  sad: ["heartbroken", "C1", "She was heartbroken when it ended.", "悲しみが深く、胸が痛む感じ。"],
  busy: ["swamped", "C1", "I'm swamped with assignments this week.", "仕事や課題に埋もれている口語表現。"],
  delicious: ["mouthwatering", "C1", "The ramen smelled mouthwatering.", "見た目や香りで食欲が湧く感じ。"],
  hot: ["scorching", "C1", "It was a scorching afternoon.", "焼けつくような暑さ。"],
  scared: ["terrified", "C1", "I was terrified of speaking in public.", "very scared よりも恐怖が強く、1語で言える。"],
  excited: ["pumped", "C1", "I'm so pumped for the trip.", "くだけた会話で使う「気分が上がっている」。"],
  funny: ["hilarious", "C1", "His story was hilarious.", "笑いが止まらないほどおかしい。"],
};
const UPGRADE_RE = new RegExp(`\\b(?:very|really|so|extremely|pretty) (${Object.keys(UPGRADES).join("|")})\\b`, "gi");

const CONTRACTIONS = [
  [/\bI am\b/g, "I'm"], [/\bI will\b/g, "I'll"], [/\bI have\b/g, "I've"], [/\bdo not\b/gi, "don't"],
  [/\bdid not\b/gi, "didn't"], [/\bwas not\b/gi, "wasn't"], [/\bcannot\b/gi, "can't"],
  [/\bit is\b/gi, "it's"], [/\bthat is\b/gi, "that's"],
];

// Fillers rotate by sentence. "pre" goes in front, "post" goes at the end. null = none.
const FILLERS = [["pre", "So,"], null, ["pre", "I mean,"], ["post", "you know?"], ["pre", "honestly,"], ["pre", "Actually,"]];
const LOWERABLE = /^(The|A|An|It|We|They|He|She|This|That|There|My|Our|Last|Next|Yesterday|Today|In|On|At|When|After|Before|Then|And|But|Also|Now|Here|You)\b/;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// {{...}} marks a filler / discourse marker so the UI can highlight it.
const toSpoken = (sentence, i) => {
  let s = sentence.trim();
  COLLOCATION_RULES.forEach(([re, to]) => { s = s.replace(re, to); });
  s = s.replace(UPGRADE_RE, (_, adj) => UPGRADES[adj.toLowerCase()][0]);
  CONTRACTIONS.forEach(([re, to]) => { s = s.replace(re, to); });
  s = cap(s);
  if (!/[.!?]$/.test(s)) s += ".";
  const f = FILLERS[i % FILLERS.length];
  if (!f) return s;
  if (f[0] === "pre") return `{{${f[1]}}} ${LOWERABLE.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s}`;
  return s.replace(/[.!?]$/, `, {{${f[1]}}}`);
};

const analyzeLocal = (text) => {
  const found = [];
  COLLOCATION_RULES.forEach(([re, to, why]) => {
    const m = text.match(re);
    if (!m) return;
    const bad = m[0];
    const good = bad.replace(re, to);
    found.push({ at: m.index, end: m.index + bad.length, bad, good: /^[A-Z]/.test(bad) ? cap(good) : good, why });
  });
  found.sort((a, b) => a.at - b.at);
  const collocations = found.slice(0, MAX_COLLOCATIONS).map((c, i) => ({ id: `c${i}`, bad: c.bad, good: c.good, why: c.why }));

  const seen = new Set();
  const vocab = [];
  for (const m of text.matchAll(UPGRADE_RE)) {
    const key = m[1].toLowerCase();
    const overlaps = found.some((c) => m.index < c.end && m.index + m[0].length > c.at);
    if (overlaps || seen.has(key)) continue;
    seen.add(key);
    const [to, toLv, ex, note] = UPGRADES[key];
    vocab.push({ id: `v${vocab.length}`, from: m[0], fromLv: "B1", to, toLv, ex, note });
  }

  const sentences = (text.match(/[^.!?]+[.!?]*/g) || []).map((s) => s.trim()).filter(Boolean).slice(0, 6);
  return {
    score: Math.max(40, 100 - 8 * collocations.length - 5 * vocab.length),
    collocations,
    vocab: vocab.slice(0, MAX_VOCAB),
    script: sentences.map(toSpoken),
  };
};

const analyzeText = async (text) => {
  if (API_ENDPOINT) {
    const res = await fetch(API_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  }
  await new Promise((r) => setTimeout(r, 600)); // short pause so the loading state is visible
  return analyzeLocal(text);
};

/* ------------------------------ UI pieces ------------------------------ */

const Level = ({ lv }) => (
  <span className={`border border-neutral-950 px-1.5 text-xs font-bold ${lv === "C2" ? "bg-neutral-950 text-stone-100" : lv === "C1" ? "bg-yellow-300" : ""}`}>
    {lv}
  </span>
);

const linkBtn =
  "text-sm font-bold underline underline-offset-4 hover:bg-yellow-300 disabled:cursor-default disabled:text-neutral-500 disabled:no-underline disabled:hover:bg-transparent";

const Section = ({ no, title, note, right, children }) => (
  <section className="border-t-2 border-neutral-950 pb-16 pt-5">
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="flex items-baseline gap-4">
          <span className="text-sm font-bold tabular-nums">{no}</span>
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{title}</h2>
        </div>
        {note && <p className="mt-2 max-w-xl text-sm text-neutral-600">{note}</p>}
      </div>
      {right}
    </div>
    {children}
  </section>
);

const Empty = ({ children }) => (
  <p className="border border-dashed border-neutral-500 p-5 text-sm text-neutral-600">{children}</p>
);

const SaveBtn = ({ saved, onClick }) => (
  <button onClick={onClick} disabled={saved} className={linkBtn}>
    {saved ? "単語帳に保存済み ✓" : "単語帳に保存 +"}
  </button>
);

function CollocationRow({ c, recall, saved, onSave }) {
  const [open, setOpen] = useState(false);
  const show = !recall || open;
  return (
    <li className="grid gap-x-8 gap-y-3 border-b border-neutral-950 py-6 first:pt-0 md:grid-cols-2">
      <div>
        <p className="mb-1 text-xs font-bold text-red-600">❌ Textbook</p>
        <p className="text-2xl font-semibold leading-snug text-neutral-500 line-through decoration-red-600 decoration-2">{c.bad}</p>
      </div>
      <div>
        <p className="mb-1 text-xs font-bold text-emerald-700">⭕️ Native</p>
        {show ? (
          <p className="text-2xl font-black leading-snug underline decoration-emerald-600 decoration-4 underline-offset-4">{c.good}</p>
        ) : (
          <button onClick={() => setOpen(true)} className={linkBtn}>先に自分で言い換えて、答えを見る →</button>
        )}
      </div>
      {show && <p className="max-w-2xl text-sm leading-relaxed text-neutral-700 md:col-span-2">{c.why}</p>}
      <div className="md:col-span-2"><SaveBtn saved={saved} onClick={() => onSave({ type: "collocation", en: c.good, note: `← ${c.bad}` })} /></div>
    </li>
  );
}

function VocabCell({ v, recall, saved, onSave }) {
  const [open, setOpen] = useState(false);
  const show = !recall || open;
  return (
    <li className="flex flex-col p-5">
      <div className="flex items-center gap-2 text-sm text-neutral-600">
        <Level lv={v.fromLv} /> <span className="line-through">{v.from}</span>
      </div>
      {show ? (
        <>
          <div className="mt-5"><Level lv={v.toLv} /></div>
          <p className="mt-2 text-3xl font-black leading-none tracking-tight">{v.to}</p>
          <p className="mt-4 text-sm font-medium leading-relaxed">{v.ex}</p>
          <p className="mt-2 text-xs leading-relaxed text-neutral-600">{v.note}</p>
        </>
      ) : (
        <button onClick={() => setOpen(true)} className={`${linkBtn} mt-5 text-left`}>1語で言い換えて、答えを見る →</button>
      )}
      <div className="mt-auto pt-5"><SaveBtn saved={saved} onClick={() => onSave({ type: "vocab", en: v.to, note: `← ${v.from}` })} /></div>
    </li>
  );
}

const renderLine = (s) =>
  s.split(/(\{\{.*?\}\})/).filter(Boolean).map((p, i) =>
    p.startsWith("{{") ? <mark key={i} className="bg-yellow-300 px-1 text-neutral-950">{p.slice(2, -2)}</mark> : <span key={i}>{p}</span>
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
      <div className="mb-6 flex items-center gap-5">
        <button
          onClick={toggle}
          aria-label={playing ? "一時停止" : "再生"}
          className="flex h-12 w-12 shrink-0 items-center justify-center bg-neutral-950 text-stone-100 transition hover:bg-yellow-300 hover:text-neutral-950"
        >
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <div className="h-1 flex-1 bg-neutral-300"><div className="h-full bg-neutral-950 transition-all duration-500" style={{ width: `${progress}%` }} /></div>
        <div className="flex gap-3">
          {[0.75, 1, 1.25].map((s) => (
            <button key={s} onClick={() => setSpeed(s)} className={`text-sm font-bold ${speed === s ? "underline underline-offset-4" : "text-neutral-500 hover:text-neutral-950"}`}>{s}x</button>
          ))}
        </div>
      </div>
      <ul>
        {lines.map((l, i) => (
          <li key={i}>
            <button
              onClick={() => { setCur(i); setPlaying(true); }}
              className={`block w-full px-3 py-2 text-left text-2xl font-bold leading-tight tracking-tight sm:text-3xl ${cur === i ? "bg-neutral-950 text-stone-100" : "hover:bg-stone-200"}`}
            >
              {renderLine(l)}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-xs text-neutral-600">
        <mark className="bg-yellow-300 px-1 text-neutral-950">黄色</mark> はつなぎ言葉。考える時間を稼ぐための表現です。行をクリックするとその行から再生します。
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
    <div>
      <div className="grid divide-y divide-neutral-950 border-y-2 border-neutral-950 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[["保存した表現", bank.length], ["定着済み", mastered], ["連続学習日数", 6]].map(([label, n]) => (
          <div key={label} className="p-6">
            <div className="text-7xl font-black leading-none tracking-tighter tabular-nums">{n}</div>
            <div className="mt-3 text-sm text-neutral-600">{label}</div>
          </div>
        ))}
      </div>

      <div className="mt-12 grid gap-x-12 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Section no="01" title="弱点分析" note="直近の添削で指摘が多かった項目">
            <div className="space-y-5">
              {WEAKNESS.map((w) => (
                <div key={w.label}>
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="text-sm font-bold">{w.label}</span>
                    <span className="text-2xl font-black tabular-nums">{w.pct}%</span>
                  </div>
                  <div className="h-3 bg-neutral-300"><div className="h-full bg-neutral-950" style={{ width: `${w.pct}%` }} /></div>
                </div>
              ))}
            </div>
            <p className="mb-3 mt-10 text-sm font-bold">今週の練習回数</p>
            <div className="flex h-28 items-end gap-2 border-b border-neutral-950">
              {WEEK.map(([d, n]) => (
                <div key={d} className="flex flex-1 flex-col items-center justify-end gap-1">
                  <div className="w-full bg-neutral-950" style={{ height: `${(n / maxWeek) * 80}px`, minHeight: n ? 4 : 2 }} />
                </div>
              ))}
            </div>
            <div className="mt-1 flex gap-2">{WEEK.map(([d]) => <span key={d} className="flex-1 text-center text-xs text-neutral-600">{d}</span>)}</div>
          </Section>
        </div>

        <div className="lg:col-span-3">
          <Section
            no="02"
            title="マイ単語帳"
            note="行をクリックすると定着度が変わります"
            right={
              <div className="flex gap-4">
                {[["all", "すべて"], ["collocation", "コロケーション"], ["vocab", "語彙"]].map(([k, l]) => (
                  <button key={k} onClick={() => setFilter(k)} className={`text-sm font-bold ${filter === k ? "underline underline-offset-4" : "text-neutral-500 hover:text-neutral-950"}`}>{l}</button>
                ))}
              </div>
            }
          >
            <ul className="border-t border-neutral-950">
              {items.map((b) => (
                <li key={b.id} className="border-b border-neutral-950">
                  <button onClick={() => cycle(b.id)} className="flex w-full items-center justify-between gap-4 py-4 text-left hover:bg-stone-200">
                    <div>
                      <div className="text-2xl font-bold tracking-tight">{b.en}</div>
                      <div className="text-xs text-neutral-600">{b.note}</div>
                    </div>
                    <div className="flex shrink-0 gap-1.5" title="定着度">
                      {[0, 1, 2].map((i) => <span key={i} className={`h-3 w-3 border border-neutral-950 ${i < b.mastery ? "bg-neutral-950" : ""}`} />)}
                    </div>
                  </button>
                </li>
              ))}
              {items.length === 0 && <li className="py-8 text-sm text-neutral-600">まだありません。添削結果から保存してみましょう。</li>}
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ App ------------------------------ */

const useClock = () => {
  const fmt = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" });
  const [t, setT] = useState(fmt);
  useEffect(() => { const id = setInterval(() => setT(fmt()), 30000); return () => clearInterval(id); }, []);
  return t;
};

const GUIDE = [
  ["書く", "英文をそのまま打つ。サンプルが入っています。"],
  ["分析する", "「添削・分析を実行」を押す。"],
  ["言い直す", "Active Recall をオンにして、答えを見る前に自分で考える。"],
  ["声に出す", "Shadowing Script を真似て、音読する。"],
];

export default function FluentCoach() {
  const [tab, setTab] = useState("workspace");
  const [text, setText] = useState(SAMPLE);
  const [promptIdx, setPromptIdx] = useState(0);
  const [status, setStatus] = useState("done"); // "idle" | "loading" | "done"
  const [result, setResult] = useState(() => analyzeLocal(SAMPLE));
  const [error, setError] = useState("");
  const [recall, setRecall] = useState(false);
  const [bank, setBank] = useState(INITIAL_BANK);
  const [showGuide, setShowGuide] = useState(true);
  const time = useClock();

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const isSaved = (en) => bank.some((b) => b.en === en);
  const save = (item) =>
    setBank((b) => (b.some((x) => x.en === item.en) ? b : [{ id: `${Date.now()}-${item.en}`, mastery: 0, ...item }, ...b]));

  const run = async () => {
    if (!words || status === "loading") return;
    setStatus("loading");
    setError("");
    try {
      setResult(await analyzeText(text));
    } catch (e) {
      setError("分析に失敗しました。API_ENDPOINT の設定とネットワークを確認してください。");
    }
    setStatus("done");
  };

  return (
    <div className="min-h-screen bg-stone-100 font-sans text-neutral-950">
      <header className="border-b border-neutral-950">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-2 px-5 py-4">
          <span className="text-xl font-black tracking-tight">Fluent Coach</span>
          <p className="hidden text-xs leading-snug text-neutral-600 md:block">
            based in your browser<br />working without an API key ({time} JST)
          </p>
          <p className="flex items-center gap-2 text-xs font-bold"><span className="h-2 w-2 bg-emerald-600" />Available</p>
          <nav className="flex gap-6 text-sm font-bold">
            {[["workspace", "Workspace"], ["insights", `Insights (${bank.length})`]].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={`underline-offset-8 ${tab === k ? "underline decoration-2" : "text-neutral-500 hover:text-neutral-950"}`}>{l}</button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5">
        <div className="pb-12 pt-14 sm:pt-20">
          <h1 className="text-5xl font-black leading-none tracking-tighter sm:text-7xl md:text-8xl">
            {tab === "insights" ? "Look back. Remember." : "Write. Fix. Say it."}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed">
            {tab === "insights"
              ? "指摘された表現と弱点を、定着するまで見返すためのノートです。"
              : "教科書の英語を、ネイティブが実際に口にする英語へ。書いて、直して、声に出すためのコーチです。"}
          </p>
        </div>

        {tab === "insights" ? (
          <Insights bank={bank} setBank={setBank} />
        ) : (
          <>
            {showGuide && (
              <div className="mb-14">
                <div className="mb-2 flex justify-end">
                  <button onClick={() => setShowGuide(false)} className={linkBtn}>ガイドを閉じる ×</button>
                </div>
                <ol className="grid gap-px border border-neutral-950 bg-neutral-950 sm:grid-cols-4">
                  {GUIDE.map(([t, d], i) => (
                    <li key={t} className="bg-stone-100 p-4">
                      <span className="text-sm font-bold tabular-nums">0{i + 1}</span>
                      <p className="mt-2 text-lg font-black">{t}</p>
                      <p className="mt-1 text-xs leading-relaxed text-neutral-600">{d}</p>
                    </li>
                  ))}
                </ol>
                <p className="mt-2 text-xs text-neutral-600">簡易ルールで分析します。登録済みの表現パターンだけを検出し、見つからない場合は「該当なし」と表示します。</p>
              </div>
            )}

            <Section no="01" title="Output Workspace" note="日記、意見、スピーチ原稿など。話すつもりで書いてください。">
              <div className="grid gap-x-10 gap-y-6 md:grid-cols-3">
                <div>
                  <p className="text-sm text-neutral-600">今日のお題</p>
                  <p className="mt-2 text-2xl font-bold leading-snug tracking-tight">{PROMPTS[promptIdx]}</p>
                  <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
                    <button onClick={() => setPromptIdx((i) => (i + 1) % PROMPTS.length)} className={`${linkBtn} inline-flex items-center gap-1.5`}><Shuffle size={13} />別のお題</button>
                    <button onClick={() => setText(SAMPLE)} className={`${linkBtn} inline-flex items-center gap-1.5`}><RotateCcw size={13} />サンプルに戻す</button>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Write the way you would say it out loud..."
                    className="h-56 w-full resize-none border border-neutral-950 bg-white p-4 text-lg leading-relaxed placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-950"
                  />
                  <p className="mt-2 text-xs tabular-nums text-neutral-600">{words} words</p>
                  <button
                    onClick={run}
                    disabled={!words || status === "loading"}
                    className="mt-4 flex w-full items-center justify-between bg-neutral-950 px-6 py-5 text-xl font-black text-stone-100 transition hover:bg-yellow-300 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-neutral-950 disabled:hover:text-stone-100"
                  >
                    <span>{status === "loading" ? "Analyzing…" : "添削・分析を実行"}</span>
                    {status === "loading" ? <Loader2 size={22} className="animate-spin" /> : <span>→</span>}
                  </button>
                  {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                </div>
              </div>
            </Section>

            {status === "loading" ? (
              <div className="space-y-6 pb-16">
                {[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse bg-stone-200" />)}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-end justify-between gap-6 border-t-2 border-neutral-950 py-8">
                  <div className="flex items-end gap-3">
                    <span className="text-8xl font-black leading-none tracking-tighter tabular-nums">{result.score}</span>
                    <span className="pb-2 text-sm text-neutral-600">/ 100<br />自然さスコア</span>
                  </div>
                  <div>
                    <button
                      onClick={() => setRecall((r) => !r)}
                      aria-pressed={recall}
                      className={`border border-neutral-950 px-4 py-3 text-sm font-bold transition ${recall ? "bg-neutral-950 text-stone-100" : "hover:bg-yellow-300"}`}
                    >
                      <Eye size={14} className="mr-2 inline" />Active Recall: {recall ? "ON" : "OFF"}
                    </button>
                    <p className="mt-2 max-w-xs text-xs text-neutral-600">オンにすると答えを隠します。先に自分で言い直してから確認できます。</p>
                  </div>
                </div>

                <Section no="02" title="Collocation Audit" note="文法は合っているが、ネイティブは言わない組み合わせ">
                  {result.collocations.length ? (
                    <ul className="border-t border-neutral-950 pt-6">
                      {result.collocations.map((c) => (
                        <CollocationRow key={c.id} c={c} recall={recall} saved={isSaved(c.good)} onSave={save} />
                      ))}
                    </ul>
                  ) : (
                    <Empty>不自然な組み合わせは見つかりませんでした。</Empty>
                  )}
                </Section>

                <Section no="03" title="Vocabulary Level-up" note="B1〜B2の語を、C1〜C2の表現へ">
                  {result.vocab.length ? (
                    <ul className="grid divide-y divide-neutral-950 border-y border-neutral-950 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                      {result.vocab.map((v) => (
                        <VocabCell key={v.id} v={v} recall={recall} saved={isSaved(v.to)} onSave={save} />
                      ))}
                    </ul>
                  ) : (
                    <Empty>置き換え候補は見つかりませんでした。「very + 形容詞」を使うと提案が出ます。</Empty>
                  )}
                </Section>

                <Section no="04" title="Shadowing Script" note="あなたの伝えたかったことを、話し言葉に書き換えました。">
                  {result.script.length ? (
                    <ShadowingScript key={result.script.join("|")} lines={result.script} />
                  ) : (
                    <Empty>英文を入力して分析を実行すると、話し言葉の台本が作られます。</Empty>
                  )}
                </Section>
              </>
            )}
          </>
        )}
      </main>

      <footer className="border-t-2 border-neutral-950 px-5 py-16 text-center">
        <p className="text-4xl font-black leading-tight tracking-tighter sm:text-6xl">
          WRITE IT.<br />FIX IT.<br />SAY IT OUT LOUD.
        </p>
        <p className="mt-8 text-xs text-neutral-600">UI mockup with a rule-based demo engine.</p>
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className={`${linkBtn} mt-3`}>Back to the top ↑</button>
      </footer>
    </div>
  );
}