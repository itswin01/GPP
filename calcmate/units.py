from __future__ import annotations

"""Unit awareness for the pipeline.

The solver works in canonical SI (metre, second, m/s, ...). This module:

* converts extracted quantities from whatever unit they were stated in
  (km, hours, minutes, km/h, ...) into the SI unit for their symbol, so the
  arithmetic and the attached unit label always agree; and
* parses the output unit a problem asks for ("in km/h", "in kilometres per
  minute", "in minutes") and converts the verified answer into it.

All conversions go through Pint. If Pint is unavailable or a unit cannot be
parsed, conversions degrade to a no-op rather than crashing.
"""

import re

from calcmate.constants import UNIT_BY_SYMBOL

_registry_cache = None
_registry_init = False


def _registry():
    global _registry_cache, _registry_init
    if not _registry_init:
        _registry_init = True
        try:
            import pint

            _registry_cache = pint.UnitRegistry()
        except ImportError:
            _registry_cache = None
    return _registry_cache


# Loose unit strings -> Pint-parseable expressions.
_PINT_ALIASES = {
    "m/s^2": "meter/second**2",
    "m/s2": "meter/second**2",
    "m/s**2": "meter/second**2",
    "m/s": "meter/second",
    "km/h": "kilometer/hour",
    "kmph": "kilometer/hour",
    "km/hr": "kilometer/hour",
    "km/min": "kilometer/minute",
    "m/min": "meter/minute",
    "cm/s": "centimeter/second",
    "cm/min": "centimeter/minute",
    "km/s": "kilometer/second",
    "m/day": "meter/day",
    "km/day": "kilometer/day",
    "km": "kilometer",
    "cm": "centimeter",
    "mm": "millimeter",
    "m": "meter",
    "s": "second",
    "sec": "second",
    "min": "minute",
    "h": "hour",
    "hr": "hour",
    "day": "day",
}


def to_pint(unit: str) -> str:
    normalized = (unit or "").strip().lower().replace("^", "**")
    return _PINT_ALIASES.get(normalized, normalized)


def convert(value: float, from_unit: str, to_unit: str) -> float | None:
    """Convert ``value`` from one unit to another, or None if not possible."""
    registry = _registry()
    if registry is None:
        return None
    try:
        quantity = registry.Quantity(float(value), to_pint(from_unit)).to(to_pint(to_unit))
        return float(quantity.magnitude)
    except Exception:  # noqa: BLE001 - unparseable/incompatible units are a no-op
        return None


def to_si(value: float, unit: str, symbol: str) -> tuple[float, str]:
    """Convert a quantity to the SI unit registered for its symbol.

    Returns ``(value, unit)`` unchanged when there is nothing to convert or the
    conversion is not possible (e.g. an unexpected/incompatible unit).
    """
    target = UNIT_BY_SYMBOL.get(symbol)
    if not target or not unit:
        return float(value), unit
    converted = convert(value, unit, target)
    if converted is None:
        return float(value), unit
    return converted, target


# How a problem can ask for its answer in a particular unit. "in <unit>" is
# the common phrasing, but questions just as often front the unit instead
# ("How many minutes does it take?", "How many kilometres does it cover?"),
# which the "in" form alone silently misses - the answer then comes back
# correct but in SI, which reads as wrong.
_ASK = r"(?:\bin|\bhow\s+many)\s+"

# Ordered most-specific-first: speed (compound) before length/time (simple), so
# "in km/h" is read as a speed rather than a bare "km".
_OUTPUT_PATTERNS = [
    (_ASK + r"(?:kilomet(?:er|re)s?|km)\s*(?:/|per)\s*(?:hours?|hr|h)\b", "km/h"),
    (_ASK + r"(?:kilomet(?:er|re)s?|km)\s*(?:/|per)\s*(?:minutes?|min)\b", "km/min"),
    (_ASK + r"(?:met(?:er|re)s?|m)\s*(?:/|per)\s*(?:seconds?|sec|s)\b", "m/s"),
    (_ASK + r"(?:met(?:er|re)s?|m)\s*(?:/|per)\s*(?:minutes?|min)\b", "m/min"),
    (_ASK + r"(?:centimet(?:er|re)s?|cm)\s*(?:/|per)\s*(?:seconds?|sec|s)\b", "cm/s"),
    (_ASK + r"(?:kilomet(?:er|re)s?|km)\b", "km"),
    (_ASK + r"(?:centimet(?:er|re)s?|cm)\b", "cm"),
    (_ASK + r"(?:met(?:er|re)s?|m)\b", "m"),
    (_ASK + r"(?:minutes?|min)\b", "min"),
    (_ASK + r"(?:seconds?|sec)\b", "s"),
    (_ASK + r"(?:hours?|hr)\b", "h"),
]


def parse_requested_unit(text: str) -> str | None:
    lowered = text.lower()
    for pattern, unit in _OUTPUT_PATTERNS:
        if re.search(pattern, lowered):
            return unit
    return None
