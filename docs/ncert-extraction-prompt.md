# NCERT extraction prompt

Paste the block below into an LLM along with one chapter's text to produce
JSONL rows for the GNN training dataset.

**Edit only the `SOURCE PROFILE` block per PDF.** Everything below it is tied
to the knowledge graph, not to any book — changing it per source produces rows
that are not comparable, and the train/test split is cross-source.

Before using it on a new PDF, check the file actually has a text layer:

```powershell
python -c "from pypdf import PdfReader; d=PdfReader(r'FILE.pdf'); print(sum(len(p.extract_text() or '') for p in d.pages), 'chars /', len(d.pages), 'pages')"
```

Under ~200 chars per page means it is scanned images — do not use it. A PDF
printed from a solutions website will also have ads overlapping the text,
which destroys questions silently.

---

## The prompt

````text
You extract physics problems from a textbook chapter into JSONL rows used to
train a graph neural network that RANKS EQUATIONS. You are an EXTRACTOR.
You never solve. You never choose which equation to use. You never convert units.

╔══════════════════════════════════════════════════════════════════════╗
║  SOURCE PROFILE — edit ONLY this block per PDF                       ║
╠══════════════════════════════════════════════════════════════════════╣
║  book:              NCERT Physics Part I                             ║
║  class:             11                                               ║
║  chapter_no:        3                                                ║
║  chapter:           Motion in a Straight Line                        ║
║  section:           Exercises                                        ║
║  case_id_prefix:    ncert_ch3_                                       ║
║  question_pattern:  "Q3.<n>" at the start of a line                  ║
║  answer_delimiter:  "Answer." immediately following the question     ║
║  grade_default:     11                                               ║
╚══════════════════════════════════════════════════════════════════════╝
If answer_delimiter is "NONE", the book prints no answers: set
stated_answer to null and add flag `answer_not_printed`. That is expected,
not an error.

══════════════════════════════════════════════════════════════════════
SYMBOL VOCABULARY — the ONLY symbols allowed in `givens` / `target`
══════════════════════════════════════════════════════════════════════
SUVAT family (use whenever acceleration appears ANYWHERE in the problem):
  u   initial velocity       m/s     v   final velocity      m/s
  a   acceleration           m/s^2   t   time                s
  s   displacement, height, or distance travelled            m

Plain family (use ONLY for constant-speed problems with NO acceleration):
  speed     m/s        distance    m        time    s

Two-body family:
  v1  velocity of the FIRST body            m/s
  v2  velocity of the SECOND body           m/s
  separation      initial gap between them  m
  relative_speed  relative velocity         m/s
  direction       +1 opposite, -1 same      (no unit)

Other:
  avg_v   average velocity                  m/s

▸ FAMILY RULE — this is the single most common extraction error.
  Use `time` ONLY when `speed` and `distance` are also the symbols in play,
  i.e. the problem is pure constant-speed motion. In EVERY other case the
  time symbol is `t`. A two-body meeting problem asking "after how long do
  they meet" has target `t`, NOT `time`.
  Same for `distance` vs `s`: use `distance` only alongside `speed`/`time`.

▸ If a needed quantity has no symbol here → flag `symbol_not_in_vocabulary`
  and park. Never invent a symbol.

══════════════════════════════════════════════════════════════════════
CONSTRAINT IDs — emit by MEANING, never by matching exact wording
══════════════════════════════════════════════════════════════════════
  constraint_from_rest                            body begins at rest    u = 0
  constraint_comes_to_rest                        body ends at rest      v = 0
  constraint_constant_speed                       uniform/constant speed a = 0
  constraint_max_height_v_zero                    at the top of a rise   v = 0
  constraint_free_fall_upward_a_minus_g           thrown/projected up    a = -9.8
  constraint_same_direction_relative_motion       chasing, overtaking, same direction
  constraint_opposite_direction_relative_motion   approaching, opposite directions

The PHYSICS decides, not the phrasing. All of the following must emit
constraint_free_fall_upward_a_minus_g:
    "thrown upward" · "throws a ball upwards" · "projected vertically up"
    "a player throws the ball up" · "hurled skyward" · "flung straight up"
All of these emit constraint_comes_to_rest:
    "comes to rest" · "is brought to a stop" · "brakes to a halt"
    "until it stops" · "decelerates to rest"
All of these emit constraint_max_height_v_zero:
    "maximum height" · "highest point" · "to what height does it rise"
    "peaks at" · "at the top of its flight"

Every constraint MUST carry `span`: the verbatim substring justifying it.
No span → do not emit the constraint.

══════════════════════════════════════════════════════════════════════
EQUATION IDs — permitted ONLY inside `stated_equations`
══════════════════════════════════════════════════════════════════════
  eq_s_vt            s = v*t                    (uniform motion only)
  eq_average_speed   speed = distance/time
  eq_v_u_at          v = u + a*t
  eq_s_ut_half_at2   s = u*t + a*t^2/2
  eq_v2_u2_2as       v^2 = u^2 + 2*a*s
  eq_avg_velocity    avg_v = (u+v)/2
  eq_time_of_flight  t = -2*u/a                 (up and back to launch height)
  eq_relative_speed  relative_speed = v1 + direction*v2
  eq_meeting_time    t = separation/relative_speed
Never place an equation in any other field.

══════════════════════════════════════════════════════════════════════
RULES
══════════════════════════════════════════════════════════════════════
1.  BOUNDARY. The question ends at answer_delimiter. Everything after it is
    the worked solution and may populate ONLY `stated_answer` and
    `stated_equations`. Solution text must NEVER enter `problem_text`.
    No delimiter present and profile says one exists → flag
    `boundary_unclear` and park.

2.  UNITS AS PRINTED. "126 km/h" → value 126, unit "km/h". "45 minutes" →
    value 45, unit "minutes". Never convert to SI; conversion happens
    downstream and doing it here corrupts the row.

3.  ONE TARGET PER ROW. A question asking two things becomes two rows with
    identical givens. "What is the retardation, and how long does it take
    to stop?" → `<prefix>q3.6a` (target a) and `<prefix>q3.6b` (target t).

4.  MULTIPART. Parts (a)(b)(c)(d) each become their own row, question_no
    "3.10a", "3.10b", … A question may be part-kept and part-parked.

5.  NEVER INFER HIDDEN PHYSICS. If the body is thrown upward, emit the
    CONSTRAINT — do not write a = -9.8 as a given. This holds even when the
    text says "take g = 9.8 m/s^2": the constraint owns the signed value.
    Likewise never write u = 0 for "starts from rest"; emit the constraint.
    A given must be a number the problem literally states for that symbol.

6.  DISTRACTOR GIVENS. A value stated in the text but not needed for THIS
    row's target goes in `distractor_givens` with a one-line `why_unused`.
    Never silently drop it — these are high-value training signal.

7.  PARK, DON'T FORCE. Emit the row with `"keep": false`, the flag, and a
    `park_reason`. Fill whatever fields you can. Park when:
      multi_phase            two sequential motions ("accelerates for 10 s,
                             THEN moves uniformly"; out-and-back journeys)
      multi_body             two or more bodies each needing their own
                             equation (two trains; car B and car C)
      velocity_composition   body launched from a moving carrier
                             (bullet fired from a moving van)
      conceptual             no numeric answer requested
      figure_required        a value must be read off a plot
      needs_2d               projectile, vectors, angles, circular motion
      symbol_not_in_vocabulary
      boundary_unclear
      answer_corrupted
      text_occluded

8.  DO NOT TRUST PRINTED ANSWERS. Some chapters bleed one question's
    solution into another's. If the worked solution discusses quantities
    absent from this question, set `stated_answer: null` and flag
    `answer_corrupted`. A missing answer is harmless; a wrong one poisons
    the row.

9.  NO RECONSTRUCTION. If any part of the question or answer is cut off,
    covered, or unreadable, flag `text_occluded` and park. Never infer
    missing words from context.

10. MODALITY. "text" — every value is in the sentence. "text_with_figure" —
    a figure exists but all values are still in the sentence (KEEP these).
    "figure_required" — a value must be read off the plot (PARK these).

11. EMIT EVERY QUESTION, kept or parked. A silently skipped question is
    indistinguishable from one that doesn't exist.

12. OUTPUT: one JSON object per line. No markdown fences. No commentary.
    No trailing prose. If a page has no question, output nothing for it.

══════════════════════════════════════════════════════════════════════
SCHEMA
══════════════════════════════════════════════════════════════════════
{
  "case_id": "<case_id_prefix>q<question_no>",
  "keep": true,
  "modality": "text",
  "source": {"book":"…","class":11,"chapter_no":3,"chapter":"…",
             "section":"…","question_no":"3.6a","page":56},
  "problem_text": "…verbatim, question only…",
  "givens": {"<sym>": {"value": 0, "unit": "…", "span": "…"}},
  "distractor_givens": {"<sym>": {"value": 0, "unit": "…", "span": "…",
                                  "why_unused": "…"}},
  "target": {"symbol": "…", "requested_unit": "…"},
  "conditions": [{"constraint_id": "…", "span": "…"}],
  "stated_answer": {"value": 0, "unit": "…"},
  "stated_equations": ["eq_…"],
  "concept_hint": "uniform_motion | uniform_acceleration | relative_motion",
  "difficulty": "easy | medium | hard",
  "grade": 11,
  "n_steps_stated": 1,
  "flags": [],
  "park_reason": null
}
````

---

## What the pipeline adds afterwards

Do **not** ask the LLM for these — they are computed:

`knowns_at_slot` · `valid_equations` (oracle closure with gates) ·
`concept` (derived from the KG) · `reasoning_program` (solver trace) ·
`structural_signature` · `retrieval_prior` · `retrieval_correct` ·
`paraphrase_group_id` · `adversarial_pair_id` · `split` · `kg_hash`

`retrieval_correct: false` marks the rows where the cascade actually needs the
GNN. Upweight them and report Hit@1 separately on that subset — if the GNN
cannot beat retrieval *there*, it has no job.

## Three gates before a row enters training

1. **Oracle solves it** — closure with gates reaches the target.
2. **Oracle agrees with `stated_answer`** within 2%; mismatch → human review.
3. **Live-pipeline check** — `CalcMatePipeline` fires the same constraints the
   row declares. This one is **not yet implemented** and is the train/inference
   skew described in HANDOFF.md §9.3.

## Expected yield

Measured on NCERT Class 11 Chapter 3 (28 exercise questions):

| Bucket | Count |
|---|---|
| Numerical 1-D (usable) | 8 → ~5 rows after review |
| Graph-based | 15 (10 of them conceptual, so unusable even with vision) |
| Conceptual | 3 |
| Needs 2-D | 1 |

Only **1 of 28** genuinely requires reading a plot. NCERT is better used as a
source of **real-world phrasings** to template from than as a corpus — one
chapter yields roughly ten rows.
