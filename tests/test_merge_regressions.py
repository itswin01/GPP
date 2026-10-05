"""Regressions for the three solver bugs the pipeline evaluation exposed.

Each of these produced a confidently *wrong* number before the fix, which is
the failure mode this system is specifically built to avoid - so each gets a
test rather than relying on the corpus-wide evaluation script to catch it.

Run the full corpus check with:  python -m scripts.evaluate_pipeline
"""

import os
import unittest

# Keep the narrator deterministic so no test ever reaches the network,
# regardless of whether GROQ_API_KEY happens to be set. See test_reasoning.py.
os.environ["CALCMATE_USE_DSPY_NARRATOR"] = "0"

from calcmate.knowledge_graph import load_default_graph  # noqa: E402
from calcmate.models import ExtractedProblem, Quantity  # noqa: E402
from calcmate.overlay import load_overlay  # noqa: E402
from calcmate.pipeline import CalcMatePipeline  # noqa: E402
from calcmate.reasoning import PhysicsReasoner  # noqa: E402


class _FixtureExtractor:
    """Replays fixed knowns/target so no Groq key or network is needed."""

    def __init__(self, quantities: dict, target: str, triggers=()) -> None:
        self.quantities = quantities
        self.target = target
        self.triggers = list(triggers)

    def extract(self, text: str) -> ExtractedProblem:
        return ExtractedProblem(
            raw_text=text,
            quantities={
                symbol: Quantity(symbol, value, unit, source_text=f"{value} {unit}")
                for symbol, (value, unit) in self.quantities.items()
            },
            target=self.target,
            trigger_phrases=self.triggers,
            domain_hint="kinematics",
        )


class QuadraticRootSignTests(unittest.TestCase):
    """The 2nd/3rd equations of motion are quadratic, so SymPy returns a +/-
    pair. Taking solved[0] landed on the negative root about half the time."""

    def test_elapsed_time_is_never_negative(self):
        # From rest, a = 0.5 m/s^2, s = 16 m  ->  t = +/-8 s; only +8 is physical.
        pipeline = CalcMatePipeline(
            extractor=_FixtureExtractor({"a": (0.5, "m/s^2"), "s": (16, "m")}, "t")
        )
        solution = pipeline.solve(
            "A luggage cart starts from rest and accelerates at 0.5 m/s^2 to cover 16 metres. "
            "How long does it take?",
            "ncert",
        )
        self.assertAlmostEqual(solution.answer_value, 8.0, places=3)

    def test_initial_speed_of_upward_throw_is_positive(self):
        # Max height 19.6 m under a = -9.8, v = 0  ->  u = +/-19.6 m/s.
        pipeline = CalcMatePipeline(extractor=_FixtureExtractor({"s": (19.6, "m")}, "u"))
        solution = pipeline.solve(
            "A cricket ball is thrown upward and reaches a maximum height of 19.6 m. "
            "What was its initial velocity?",
            "ncert",
        )
        self.assertAlmostEqual(solution.answer_value, 19.6, places=3)

    def test_signed_displacement_is_left_alone(self):
        # s keeps its sign: a projectile's net displacement can be negative and
        # must not be coerced positive by the root-selection rule.
        reasoner = PhysicsReasoner(load_default_graph())
        self.assertEqual(reasoner._choose_root("s", [-5.0, 5.0]), -5.0)
        self.assertEqual(reasoner._choose_root("t", [-5.0, 5.0]), 5.0)


class UniformMotionEquationGateTests(unittest.TestCase):
    """s = v*t only holds at constant velocity. Applied to accelerated motion
    after a constraint set v=0, it confidently returned s = 0."""

    def test_decelerating_body_does_not_use_uniform_motion_law(self):
        pipeline = CalcMatePipeline(
            extractor=_FixtureExtractor(
                {"u": (3, "m/s"), "a": (-0.6, "m/s^2"), "t": (5, "s")}, "s"
            )
        )
        solution = pipeline.solve(
            "A rowing boat glides toward the jetty at 3 m/s with an acceleration of "
            "-0.6 m/s^2 and comes to rest in 5 seconds. How far does it glide?",
            "ncert",
        )
        self.assertAlmostEqual(solution.answer_value, 7.5, places=3)
        self.assertNotIn("eq_s_vt", [step.equation_node for step in solution.steps])

    def test_uniform_motion_still_uses_it_when_there_is_no_acceleration(self):
        pipeline = CalcMatePipeline(
            extractor=_FixtureExtractor({"v": (12, "m/s"), "t": (4, "s")}, "s")
        )
        solution = pipeline.solve(
            "A tram moves at a constant speed of 12 m/s for 4 seconds. How far does it travel?",
            "ncert",
        )
        self.assertAlmostEqual(solution.answer_value, 48.0, places=3)


class CaseFallbackCorroborationTests(unittest.TestCase):
    """A borrowed case may not assert physics the problem never stated."""

    def test_uncorroborated_case_constraints_are_not_borrowed(self):
        # {t} -> s matches free-fall cases structurally, but this problem says
        # nothing about falling. Borrowing their u=0 / a=-9.8 previously
        # returned a confident -122.5 m for an under-constrained problem.
        pipeline = CalcMatePipeline(extractor=_FixtureExtractor({"t": (5, "s")}, "s"))
        solution = pipeline.solve("An object moves for 5 seconds. How far does it go?", "ncert")
        self.assertTrue(solution.was_unresolved)
        self.assertIsNone(solution.answer_value)
        self.assertIsNone(solution.fallback_case_id)


class OutputUnitPhrasingTests(unittest.TestCase):
    """"How many minutes ...?" asks for an output unit just as "in minutes"
    does; missing it returned a correct SI value that reads as wrong."""

    def test_how_many_phrasing_sets_the_output_unit(self):
        pipeline = CalcMatePipeline(
            extractor=_FixtureExtractor({"v": (90, "km/h"), "s": (45, "km")}, "t")
        )
        solution = pipeline.solve(
            "A car cruises along a highway at 90 km/h. How many minutes does it take to cover 45 km?",
            "ncert",
        )
        self.assertEqual(solution.answer_unit, "min")
        self.assertAlmostEqual(solution.answer_value, 30.0, places=3)


class DimensionalVerificationTests(unittest.TestCase):
    """Verification now covers every equation and substitution, not just the
    final answer's unit."""

    def test_verification_reports_all_equations_and_substitutions(self):
        pipeline = CalcMatePipeline(extractor=_FixtureExtractor({"u": (20, "m/s")}, "s"))
        solution = pipeline.solve(
            "A ball is thrown upward with initial velocity 20 m/s. Find the maximum height.",
            "ncert",
        )
        detail = next(t.detail for t in solution.phase_trace if t.phase == "7_unit_validation")
        self.assertIn("Dimensional balance held", detail)
        self.assertIn("unit consistency held", detail)


class MergedCorpusTests(unittest.TestCase):
    """Both case schemas must reach the shared pool through one normalizer."""

    def test_both_schemas_load_with_flat_structural_fields(self):
        from calcmate.case_graph import load_all_cases

        cases = load_all_cases()
        v2 = [case for case in cases if case.get("reasoning_program")]
        flat = [case for case in cases if not case.get("reasoning_program")]
        self.assertGreater(len(v2), 0, "schema-v2 corpus did not load")
        self.assertGreater(len(flat), 0, "flat-schema corpus did not load")
        # The fields node2vec/TF-IDF/CaseFallbackSolver read must exist on both.
        for case in (v2[0], flat[0]):
            for key in ("known_symbols", "unknown", "equations_used", "constraints_fired"):
                self.assertIn(key, case)


if __name__ == "__main__":
    unittest.main()
