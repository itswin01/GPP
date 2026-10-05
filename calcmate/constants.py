from calcmate.text_patterns import compile_phrase_set

# SUVAT symbols (u, v, a, t, s) plus the plain grade 6/7 quantities
# (speed, distance, time) that the graph also models as standalone nodes,
# plus average-velocity, vertical-projectile-time-of-flight, and two-body
# relative-motion symbols (see data/kinematics_graph.json: eq_avg_velocity,
# eq_time_of_flight, eq_relative_speed, eq_meeting_time).
UNIT_BY_SYMBOL = {
    "u": "m/s",
    "v": "m/s",
    "a": "m/s^2",
    "t": "s",
    "s": "m",
    "speed": "m/s",
    "distance": "m",
    "time": "s",
    "avg_v": "m/s",
    "v1": "m/s",
    "v2": "m/s",
    "relative_speed": "m/s",
    "direction": "",
    "separation": "m",
}
CANONICAL_SYMBOLS = set(UNIT_BY_SYMBOL)

# Pint-parseable canonical dimension for every symbol that can appear in a
# graph equation. Used by calcmate.verification.DimensionalVerifier to check
# that each equation is dimensionally balanced (LHS dimension == RHS
# dimension) and that every substituted quantity carries a dimensionally
# consistent unit. Kept as a separate table from UNIT_BY_SYMBOL because a
# *dimension* check must accept any compatible unit ("km" for a length),
# while UNIT_BY_SYMBOL names the one canonical SI unit we solve in.
SYMBOL_DIMENSIONS = {
    "u": "meter/second",
    "v": "meter/second",
    "a": "meter/second**2",
    "t": "second",
    "s": "meter",
    "speed": "meter/second",
    "distance": "meter",
    "time": "second",
    "avg_v": "meter/second",
    "v1": "meter/second",
    "v2": "meter/second",
    "relative_speed": "meter/second",
    "separation": "meter",
    # A relative-direction factor (+1 opposite, -1 same) is a pure number.
    "direction": "dimensionless",
}

# Base accepted spellings for each canonical symbol. These no longer need to
# enumerate every surface variant (plural, hyphenation, verb tense) - they
# are compiled into tolerant regex patterns below via SYMBOL_ALIAS_PATTERNS.
SYMBOL_ALIASES: dict[str, set[str]] = {
    "u": {
        "initial_velocity", "initial velocity",
        "vi", "v_i",
    },
    "v": {
        "velocity",
        "final_velocity", "final velocity",
        "vf", "v_f",
    },
    "a": {
        "acceleration",
    },
    "t": {
        "elapsed time",
        "travel time",
        "duration",
    },
    "s": {
        "distance travelled",
        "distance traveled",
        "total distance",
        "displacement",
    },
    "speed": {
        "avg speed", "average speed",
    },
    "distance": {
        "d",
    },
    "time": set(),
    "avg_v": {
        "average velocity", "mean velocity",
    },
    "v1": {
        "velocity of the first object", "first object's velocity",
        "speed of the first object", "v_1", "va",
    },
    "v2": {
        "velocity of the second object", "second object's velocity",
        "speed of the second object", "v_2", "vb",
    },
    "relative_speed": {
        "relative velocity", "relative speed",
    },
    "direction": set(),
    "separation": {
        "distance apart", "initial distance apart", "initial separation",
        "gap between them", "distance between them",
    },
}

# One compiled regex per canonical symbol, matching the symbol itself plus
# any of its aliases (with spacing/inflection tolerance). Used instead of
# exact set-membership checks so phrasing variants aren't silently missed.
SYMBOL_ALIAS_PATTERNS: dict[str, "re.Pattern[str]"] = {
    canonical: compile_phrase_set(aliases | {canonical})
    for canonical, aliases in SYMBOL_ALIASES.items()
}
