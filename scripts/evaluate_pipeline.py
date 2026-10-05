from __future__ import annotations

"""End-to-end accuracy harness over the schema-v2 corpus.

Every v2 case carries both its inputs (``givens``) and its verified answer
(``final_answer``), so the whole pipeline can be measured without a Groq key:
a fixture extractor replays the case's own givens/target, and the answer the
pipeline produces is compared against the case's recorded answer.

This measures the *reasoning* half of the system (phases 1b-9) in isolation.
Extraction quality is deliberately excluded - it needs the LLM boundary and is
the one part that cannot be scored deterministically.

Run:
    python -m scripts.evaluate_pipeline
    python -m scripts.evaluate_pipeline --show-failures
"""

import argparse
import json
import os
import sys
from collections import Counter
from pathlib import Path

# This harness measures the DETERMINISTIC half of the system, so it must never
# reach the network. The extractor is faked per case, but the narrator is not:
# with GROQ_API_KEY present in the environment, Narrator() builds a live DSPy
# program and every case makes a real API call. Force the template narrator so
# the "no Groq key needed" promise in the docstring actually holds.
os.environ["CALCMATE_USE_DSPY_NARRATOR"] = "0"

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from calcmate.models import ExtractedProblem, Quantity  # noqa: E402
from calcmate.pipeline import CalcMatePipeline  # noqa: E402

CASE_DIR = PROJECT_ROOT / "data" / "cases" / "kinematics"
TOLERANCE = 0.02  # relative; the corpus rounds its recorded answers


class _CaseExtractor:
    """Replays one case's recorded givens/target, bypassing the LLM boundary."""

    def __init__(self, case: dict) -> None:
        self.case = case

    def extract(self, text: str) -> ExtractedProblem:
        quantities = {
            symbol: Quantity(
                symbol=symbol,
                value=float(given["value"]),
                unit=str(given.get("unit", "")),
                source_text=f"{given['value']} {given.get('unit', '')}".strip(),
            )
            for symbol, given in (self.case.get("givens") or {}).items()
        }
        return ExtractedProblem(
            raw_text=text,
            quantities=quantities,
            target=(self.case.get("target") or {}).get("symbol", ""),
            trigger_phrases=list(self.case.get("trigger_phrases") or []),
            domain_hint=self.case.get("chapter", "kinematics"),
        )


def load_v2_cases() -> list[dict]:
    cases: list[dict] = []
    for path in sorted(CASE_DIR.glob("*.jsonl")):
        for raw_line in path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if line:
                cases.append(json.loads(line))
    return cases


def _matches(actual: float | None, expected: float) -> bool:
    if actual is None:
        return False
    scale = max(abs(expected), 1e-9)
    return abs(actual - expected) / scale <= TOLERANCE


def main() -> int:
    parser = argparse.ArgumentParser(description="Score the pipeline against the schema-v2 corpus.")
    parser.add_argument("--show-failures", action="store_true")
    parser.add_argument("--overlay", default="ncert")
    args = parser.parse_args()

    cases = load_v2_cases()
    if not cases:
        print(f"No cases found under {CASE_DIR}.")
        return 1

    outcomes: Counter[str] = Counter()
    by_concept: dict[str, Counter[str]] = {}
    failures: list[str] = []

    for case in cases:
        expected = (case.get("final_answer") or {}).get("value")
        if expected is None:
            outcomes["skipped_no_answer"] += 1
            continue

        pipeline = CalcMatePipeline(extractor=_CaseExtractor(case))
        try:
            solution = pipeline.solve(case["problem_text"], args.overlay)
        except Exception as exc:  # noqa: BLE001 - a crash is itself a result worth counting
            outcomes["error"] += 1
            failures.append(f"{case['case_id']}: raised {type(exc).__name__}: {exc}")
            continue

        if solution.was_unresolved:
            outcome = "unresolved"
            failures.append(f"{case['case_id']}: unresolved (expected {expected})")
        elif _matches(solution.answer_value, float(expected)):
            outcome = "correct_via_fallback" if solution.fallback_case_id else "correct"
        else:
            outcome = "wrong"
            failures.append(
                f"{case['case_id']}: got {solution.answer_value} {solution.answer_unit}, "
                f"expected {expected} {(case.get('final_answer') or {}).get('unit', '')}"
                + (f" [borrowed {solution.fallback_case_id}]" if solution.fallback_case_id else "")
            )

        outcomes[outcome] += 1
        by_concept.setdefault(case.get("concept", "?"), Counter())[outcome] += 1

    total = sum(outcomes.values())
    correct = outcomes["correct"] + outcomes["correct_via_fallback"]
    print("=" * 70)
    print(f"PIPELINE EVALUATION  |  cases: {total}")
    print(f"  correct           : {correct}  ({correct / total:.1%})")
    print(f"    via graph solver: {outcomes['correct']}")
    print(f"    via case fallback: {outcomes['correct_via_fallback']}")
    print(f"  WRONG             : {outcomes['wrong']}")
    print(f"  unresolved        : {outcomes['unresolved']}   (no answer given, not a wrong answer)")
    print(f"  errors            : {outcomes['error']}")
    print("=" * 70)

    for concept, counts in sorted(by_concept.items()):
        concept_total = sum(counts.values())
        concept_correct = counts["correct"] + counts["correct_via_fallback"]
        print(f"  {concept:<28} {concept_correct}/{concept_total}")

    if args.show_failures and failures:
        print("\nFAILURES:")
        for line in failures:
            print(f"  {line}")

    # Only a *wrong answer* is a hard failure. Refusing to answer is the
    # designed behaviour for a problem the system cannot verify.
    return 1 if outcomes["wrong"] or outcomes["error"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
