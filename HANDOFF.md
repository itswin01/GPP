# CalcMate — Handoff

Everything needed to pick this project back up cold, or to hand it to another
developer or AI assistant with no prior context.

Last updated: 2026-10-06 · branch `new-dev` · commit `c9eff4e`

---

## 1. What this is

A neuro-symbolic physics tutor for one chapter: **Motion in a Straight Line
(1-D kinematics)**. Python 3.12 + FastAPI backend, React + TypeScript frontend.

**The core principle, which everything else follows from:**

> An LLM is used at exactly two narrow boundaries — *extraction* (text →
> structured facts) and *narration* (verified answer → prose). All physics
> reasoning is deterministic: a NetworkX knowledge graph + SymPy + Pint. The
> LLM never chooses an equation, never infers a physical value, never produces
> a number. When the system cannot verify an answer it returns **unresolved**
> rather than guessing.

That last sentence is the product differentiator. Most tutors emit a confident
wrong number; this one declines. Protect that property.

**Stack:** FastAPI · DSPy + Groq (LLM boundary) · NetworkX (knowledge graph) ·
SymPy (solving) · Pint (units) · scikit-learn TF-IDF (retrieval) · PyTorch
(node2vec, offline only) · React + Vite + Tailwind (frontend)

---

## 2. Repository

| | |
|---|---|
| Path | `C:\GPP-neurosymbolic_physics_solver` |
| Branch | `new-dev` |
| Remote `origin` | github.com/rithin21/GPP-neurosymbolic_physics_solver (branch `new-dev`) |
| Remote `mine` | github.com/itswin01/GPP (branch `main`) |

Both remotes hold the same commit. Push to both:

```powershell
git push origin new-dev
git push mine new-dev:main
```

`new-dev` tracks `origin/rithin-dev` as upstream, so a **bare `git push` aims
at Rithin's branch**. Always name the remote explicitly.

### Branch history (why it looks odd)

`data-dev` (Tejaswin's work) and `rithin-dev` (Rithin's work) had **no common
ancestor** — `data-dev` was re-rooted onto a fresh root commit at some point.
`new-dev` is branched from `rithin-dev` with `data-dev`'s strengths merged in
as file content, not as commits. That is why `mine/main` once needed a force
push. It is now a normal fast-forward.

---

## 3. Architecture — the nine-phase pipeline

Everything funnels through `CalcMatePipeline.solve()` in
`calcmate/pipeline.py`. Reading that method top to bottom is the fastest way
to relearn the system.

1. **Extraction** (`extraction.py`, LLM) — DSPy + Groq returns strict JSON:
   `knowns_raw`, `units`, `source_text` spans, `unknown_hint`,
   `matched_trigger_phrases`. Then a large **deterministic repair layer**:
   symbol-family reconciliation, unit override from the quoted source text,
   three independent value-recovery passes, regex target detection. That
   repair layer is most of the file and it is doing real work — the LLM drops
   values regularly.
2. **1b. SI normalization** — every value converted to SI *before* anything
   downstream touches it.
3. **Retrieval** (`retrieval.py`) — **deferred**. Does not run on the happy
   path. Only fires if the graph solver raises.
4. **Constraint resolution** (`reasoning.py`) — trigger phrases matched
   against **raw problem text**, not the LLM's self-reported phrases (a
   hallucinated phrase would otherwise override a correctly extracted value),
   then meta-rules, then a completeness check.
5. **SymPy closure** — repeatedly find an equation with exactly one unknown,
   solve it, add the result to knowns. Max 20 iterations.
   - **5a/5b** on failure: retrieve similar cases, try borrowing their
     equation (`fallback_solver.py`), gated on text corroboration.
6. **Path reconstruction** — the active overlay (`ncert` / `jee`) picks which
   valid path to present.
7. **Dimensional verification** (`verification.py`) — per-equation balance +
   per-substitution unit consistency + final-answer check.
   - **7b.** Output unit conversion (SI → "in km/h").
8. **Narration** (LLM, or deterministic template).
9. **Output + logging.** Every phase appends a `PhaseTrace`.

---

## 4. Verified numbers

All measured in-session, reproducible with the commands in §6.

| Metric | Value |
|---|---|
| Unit tests | **39/39 pass** (27 without the untracked GNN tests) |
| Corpus accuracy | **150/150 = 100%** — was 81.3% before three bug fixes |
| Replay validation (opcode VM) | **150/150** |
| Dimensional balance | 150/150 |
| Substitution unit consistency | 408/408 |
| Constraint recognition | 134/134 precision and recall |
| Equation ranking — JSON file order (baseline) | **47.33% Hit@1**, MRR 0.73 |
| Equation ranking — TF-IDF | **93.33% Hit@1**, MRR 0.96 |
| Equation ranking — TF-IDF + node2vec | 93.33% Hit@1 (node2vec adds nothing) |

### The ablation that produced 100%

Worth presenting — it is more convincing than a flat 100%.

| Configuration | Accuracy | Wrong answers |
|---|---|---|
| Merged, before fixes | **81.3%** | 25 |
| + physical root selection | 88.7% | 14 |
| + "how many X" output-unit phrasing | 94.7% | 8 |
| + uniform-motion equation gate | **100%** | 0 |

### ⚠️ How to state the 100% honestly

It measures the **reasoning half only**, on **oracle-extracted inputs**, over
a corpus **built to be solvable by that same solver**. It is a sanity gate,
not a generalisation benchmark. A reviewer will ask; answer before they do.

The corpus is also easy: **93.6% single-equation**, **0 multi-phase problems**,
331 of 484 cases templated.

---

## 5. What is NOT done

- **GNN is not trained.** The 484-row dataset exists but is untracked.
- **Extraction accuracy is unmeasured.** This is the only thing between
  "reasoning-only 100%" and an honest end-to-end number.
- **No student data anywhere.** `AttemptStore` is an in-memory list with no
  `user_id`, wiped on restart. `PostgresAttemptLogger` is a contract with no
  database. Every dashboard figure is mock and **must stay labelled**.
- **No real auth.** Login writes a name to `localStorage`. Nothing is secured.
- **One chapter, one subject.** Everything else in the UI is shown locked,
  deliberately, because it genuinely does not exist in the knowledge graph.
- **0 multi-phase problems.** The flat schema holds one `t`, one `u`, one `v`
  and structurally cannot represent "accelerates, then cruises".
- `CLAUDE.md` and `README.md` describe the **pre-merge** architecture and are
  stale — no verifier, no unresolved path, no GNN.

---

## 6. Running it

### Every session

```powershell
cd C:\GPP-neurosymbolic_physics_solver
$env:GROQ_MODEL="openai/gpt-oss-120b"
$env:GROQ_MAX_TOKENS="8000"
.\.venv\Scripts\python.exe -m uvicorn calcmate.server:app --port 8000
```

Then open **http://127.0.0.1:8000**.

Calling `.\.venv\Scripts\python.exe` directly avoids `Activate.ps1`, which
PowerShell's execution policy blocks in every new terminal.

### Verification (no API key needed)

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests        # 39 tests OK
.\.venv\Scripts\python.exe -m scripts.evaluate_pipeline         # 150/150, ~2 min
.\.venv\Scripts\python.exe -m scripts.replay_validate           # PASSED: 150
.\.venv\Scripts\python.exe -m scripts.evaluate_ranking_baselines # needs data/gnn
```

### Frontend

```powershell
cd frontend
npm run build     # production — FastAPI serves frontend/dist
npm run dev       # live reload on :5173, proxies /api to :8000
```

### Demo questions (all verified working end to end)

```
A motorcycle starts from rest and accelerates at 3 m/s^2 for 8 seconds. What is its final velocity?   → 24 m/s
A ball is thrown upward with initial velocity 20 m/s. Find the maximum height.                        → 20.41 m
A school bus travels 36 km in 45 minutes. What is the average speed in km/h?                          → 48 km/h
An object moves for 5 seconds. How far does it go?                                                    → REFUSES
```

**Avoid relative-motion questions on stage** (two trains / two cars) —
extraction maps the target to the wrong symbol family and they go unresolved.

---

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Activate.ps1 cannot be loaded` | Execution policy, resets per terminal | `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`, or call the venv python by path |
| `404 model ... does not exist` | **Groq retired the model.** `llama-3.1-8b-instant` was shut down 16 Aug 2026 and it is still the hardcoded default | `$env:GROQ_MODEL="openai/gpt-oss-120b"`; see §8 to list live models |
| `ExtractionError: not valid JSON` | Reasoning models emit chain-of-thought before the JSON and truncate | `$env:GROQ_MAX_TOKENS="8000"`; use 120b, not 20b |
| Tests slow / hitting network | A script forgot `CALCMATE_USE_DSPY_NARRATOR=0`, so `Narrator()` goes live whenever `GROQ_API_KEY` is set | Set it at the **top** of the script, before importing `calcmate` |
| `ModuleNotFoundError` for sklearn/pint/dspy | Wrong interpreter | Use `.\.venv\Scripts\python.exe` |
| `No module named 'pydantic_core._pydantic_core'` | Stale venv with wrong-ABI binaries | Delete `.venv`, recreate, `pip install --no-cache-dir -r requirements.txt` |
| Scripts fail on import | Must run as modules from repo root | `python -m scripts.foo`, never `python scripts/foo.py` |
| UI changes don't appear | FastAPI serves `frontend/dist`, not source | `cd frontend; npm run build` |
| Retrieval seems worse | `CALCMATE_RETRIEVAL_BACKEND=faiss` is set | **Unset it.** faiss/sentence-transformers are not installed; it silently falls back to the weak in-memory retriever |

---

## 8. Groq model deprecation — this will break again

Groq retires models on a few months' notice. This has already broken the
project once. List what your key can actually use:

```powershell
$env:GROQ_API_KEY = (Get-Content .env | Select-String '^GROQ_API_KEY=').ToString().Split('=',2)[1].Trim()
(Invoke-RestMethod -Uri "https://api.groq.com/openai/v1/models" -Headers @{Authorization="Bearer $env:GROQ_API_KEY"}).data.id
```

Pick a **chat** model. Skip `whisper` (speech), `orpheus` (TTS),
`prompt-guard` / `safeguard` (classifiers), and `groq/compound*` (agentic,
fights the strict-JSON instruction).

**Permanent fix, not yet done:** change the hardcoded fallback in
`extraction.py`, `narration.py` and `llm_config.py` from the dead model to a
live one, so a fresh clone does not 404 on first solve.

---

## 9. Open bugs

### 9.1 `eq_s_vt` gate has a hole — highest priority

File: `calcmate/reasoning.py`

`eq_s_vt` is `s = v*t`, the **uniform-motion** distance law, valid only when
acceleration is zero. The gate:

```python
_ZERO_ACCELERATION_EQUATIONS = {"eq_s_vt"}
def _has_nonzero_acceleration(quantities):
    acceleration = quantities.get("a")
    return acceleration is not None and acceleration.value != 0
```

**The hole:** it excludes `eq_s_vt` only when `a` is *already known and
nonzero*. When `a` is unknown — i.e. it is the thing being derived — the gate
passes.

Failing case: *"A car at 126 km/h is brought to a stop within 200 m. How long
does it take?"* → the constraint sets `v=0`; givens are `u` and `s`; `a` is
unknown → gate passes → `s = v*t` runs as `200 = 0*t` → `ContradictionError`
→ the whole solve aborts with "Could not solve eq_s_vt".

The 484-case corpus never catches this because its come-to-rest problems all
**supply** `a`. Real NCERT problems invert that (give `s`, ask for `a`).

**Proper fix:** scope the equation working set by **concept**. `eq_s_vt`
belongs to `concept_uniform_motion`; this is a `concept_uniform_acceleration`
problem. The graph already has the hierarchy
(`concept -contains-> law -expressed_as-> equation`) but `resolve_domain()`
ignores it and loads every equation in the chapter. See §12.

### 9.2 Trigger phrases miss real textbook wording

Files: `data/kinematics_graph.json` (trigger_phrases), `calcmate/text_patterns.py`

Constraints fire by regex-matching trigger phrases against raw text. Two
structural limits:

- **Irregular verbs.** The stemmer turns "thrown" into
  thrown/throwns/throwned — it cannot reach "throws". So *"throws a ball
  upwards"* does not fire `constraint_free_fall_upward_a_minus_g`
  (trigger: "thrown upward").
- **Adjacency.** Patterns require tokens side by side, so *"throws a ball
  upwards"* cannot match "throw upward" with words in between.

**Measured: 4 of 5 real NCERT problems failed to fire their constraints.**

### 9.3 Train/inference skew in the GNN labeller

File: `scripts/build_gnn_dataset.py` (untracked)

`build_quantities()` trusts a case's declared `constraints_fired` and applies
their implied values. The live pipeline **ignores** declared constraints and
re-derives them from raw text. On the templated corpus both agree; on real
textbook wording they diverge, so the labeller produces labels the pipeline
cannot reproduce.

**Needed:** a new exclusion rule — only keep a row if the *live pipeline*
fires the same constraints the row declares.

### 9.4 Velocity composition is not modelled

A bullet fired from a moving van is velocity *composition*, but the graph only
has `relative_speed = v1 + direction*v2` with `direction = -1` for
same-direction. Composition needs `+1`. This is a knowledge-graph gap, not a
phrasing one.

---

## 10. The GNN work (untracked — in `data/gnn/`, `calcmate/gnn_graph.py`)

### What slot it fills

There are **two separate slots**, often confused:

| | Slot A — equation ranking | Slot B — case similarity |
|---|---|---|
| Question | "which equation solves *this* problem?" | "which solved cases resemble it?" |
| Input | problem graph attached to the KG | a seed case id |
| Component | **GNN (not built)** | **node2vec (built, working)** |
| Status | empty — equations are tried in **JSON file order** | live, in the fallback path |

They coexist. The GNN does **not** replace node2vec.

### Why Slot A matters

`resolve_domain()` loads every equation, and `solve_with_sympy` commits to the
first one that reaches a symbol — in `kinematics_graph.json` array order.
`eq_s_vt` is **first in that file**, which is literally why it won the race and
returned `s = 0`. Measured: JSON order is **47.33% Hit@1**.

### The bar to beat

**TF-IDF retrieval voting gets 93.33% Hit@1 / 0.96 MRR.** If the GNN lands
below that, a retrieval vote is sufficient and the GNN is not earning its
place. Know this *before* training.

All 13 TF-IDF failures are **one failure mode**: "thrown upward / maximum
height" problems where the wording is near-identical but the givens differ,
so the right equation differs. TF-IDF only sees text; the GNN sees
`knowns_at_slot` as graph edges. That gap is the GNN's entire opportunity.

### Dataset

`data/gnn/dataset.jsonl` — 484 rows, 284 train / 50 val / 150 test,
0 exclusions. Plus `kg_snapshot.json` (the graph the labels point at) and
`manifest.json` (seed, hashes, oracle version, per-split equation counts).

Labels are **oracle-generated** by the solver's own closure *with gates* —
never copied from the corpus's `equations_used`, because the corpus already
recorded `eq_s_vt` wrongly once.

### Corpus diagnosis (why more data of the same kind won't help)

- 484 problems → only **56 distinct structural signatures** (8.6 copies each)
- Only **18 distinct valid-equation sets**; top 3 cover 45%
- Generated corpus text-shape ratio **0.53** (templated); v2 corpus **1.00**

What is needed is **not volume** but problems where text similarity and
structural similarity **diverge**: adversarial near-misses (same wording,
different givens), paraphrase sets (same structure, different wording), and
multi-step chains.

### NCERT extraction

A full extraction prompt is in `docs/ncert-extraction-prompt.md`.

Realistic yield measured on NCERT Ch 3: **28 questions → 8 numerical → ~5
usable rows.** 54% of the chapter is graph-reading, which is inherent to the
chapter. NCERT is best used as **paraphrase templates**, not as a corpus.

Only **1 of 28** questions genuinely needs vision. Graphs are not the blocker;
**multi-phase representation** is.

---

## 11. Key files

```
calcmate/pipeline.py          orchestration, the nine phases
calcmate/reasoning.py         constraint resolution, SymPy closure, physics gates
calcmate/extraction.py        LLM boundary + deterministic repair layer
calcmate/knowledge_graph.py   graph loader and validator
calcmate/verification.py      DimensionalVerifier (3 levels of check)
calcmate/units.py             Pint SI normalization + output conversion
calcmate/text_patterns.py     inflection-tolerant phrase regex
calcmate/retrieval.py         TF-IDF / FAISS / in-memory retrievers
calcmate/fallback_solver.py   case-based fallback, corroboration-gated
calcmate/case_graph.py        node2vec + the two-schema corpus normalizer
calcmate/server.py            FastAPI; serves frontend/dist with SPA fallback
data/kinematics_graph.json    9 equations, 7 constraints, 3 concepts
data/cases/                   484 solved cases across two schemas
frontend/src/pages/           Login, Dashboard, Subjects, Solver
frontend/src/lib/api.ts       typed client + display helpers + LaTeX stripper
frontend/src/lib/mock-analytics.ts   ⚠️ all dashboard data, clearly marked
scripts/evaluate_pipeline.py      end-to-end accuracy harness
scripts/evaluate_ranking_baselines.py  ranking + verification measurements
scripts/replay_validate.py        opcode-VM replay check
scripts/build_gnn_dataset.py      GNN dataset builder (untracked)
```

### Where vectors live

| System | Location | Live? |
|---|---|---|
| TF-IDF (text) | **RAM only**, rebuilt each start, 484 × 606 sparse | ✅ default |
| node2vec (structural) | `data/cases/node2vec_embeddings.json`, 484 × 32 | ✅ fallback path |
| FAISS + sentence-transformers | `data/cases/*.faiss`, `*.meta.json` | ❌ stale (150 cases) and deps not installed |

---

## 12. Design decisions — settled, do not re-litigate

- **Retrieval is deferred**, not eager. The graph solver is authoritative; it
  gets first attempt with trigger/meta constraints only.
- **Constraints fire from raw text**, never from the LLM's self-reported
  phrases. A hallucinated phrase could otherwise inject wrong physics.
- **Labels come from the solver, never from the corpus.** The solver is the
  oracle.
- **The GNN would only re-order an existing list.** It cannot introduce an
  equation, set a value, or bypass verification. If it ranks badly you lose
  speed, never correctness.
- **LLM planner / LLM fallback were dropped.** `planning.py`, `fallback.py`,
  `rag.py`, `graph_context.py` are carried in the tree but **unwired** — they
  put an LLM in the reasoning path, which defeats the premise.
- **Mock dashboard data must stay labelled.** Every surface carries a "Sample
  data" badge. Unlabelled it would blur into the solver's real verified output.

### Deferred by decision (not forgotten)

Concept scoping of the working set · `requires` edge type to replace the
hardcoded `_CONDITIONAL_EQUATIONS` · equation ASTs built at load (removes an
`eval()` in `verification.py`) · State–Event IR for multi-phase · bipartite
variable–equation graph · Graph Matching Networks for problem similarity.

**Concept scoping is the highest-value one** — it structurally fixes bug 9.1,
and two separate bugs have now traced back to its absence.

---

## 13. Suggested order of work

1. **Fix the Groq default model** in `extraction.py`, `narration.py`,
   `llm_config.py`. Ten minutes; stops a fresh clone 404ing.
2. **Fix bug 9.1** — ideally via concept scoping, which also prevents the
   whole bug class.
3. **Expand trigger phrases** (bug 9.2) — prerequisite for any NCERT data.
4. **Measure extraction accuracy** on ~50 live prompts. Half a day, and it is
   the number that makes an end-to-end claim honest.
5. **Train the GNN.** Needs `torch`. Beat 93.33% Hit@1 or report that
   retrieval suffices.
6. **Update `CLAUDE.md` / `README.md`** — both describe the pre-merge system.
