"""Matching engine (pure Python, no DB / HTTP). 100 points: material 50, city 20, quantity 30.
City-only MVP: the optional collection radius is stored but NOT used for matching."""
from dataclasses import dataclass

MATERIALS = ["Plastic", "Paper", "Metal", "Glass", "Electronic waste", "Organic waste"]
W_MATERIAL, W_CITY, W_QTY = 50, 20, 30

@dataclass
class RecyclerProfile:
    id: int
    name: str
    city: str
    materials: list
    min_qty: float
    max_qty: float

def _n(s: str) -> str:
    return s.strip().lower()

def quantity_score(qty: float, lo: float, hi: float) -> float:
    """30 at the midpoint of [lo, hi], falling linearly to 0 at the range edges."""
    if hi == lo:
        return float(W_QTY)
    half = (hi - lo) / 2
    return round(W_QTY * max(0.0, 1 - abs(qty - (lo + hi) / 2) / half), 2)

def evaluate(material: str, qty: float, city: str, r: RecyclerProfile) -> dict:
    if qty is None or qty <= 0:
        raise ValueError("quantity must be positive")
    if r.min_qty < 0 or r.max_qty < r.min_qty:
        raise ValueError("invalid recycler quantity range")
    ok_m = _n(material) in {_n(m) for m in r.materials}
    ok_c = _n(city) == _n(r.city)
    ok_q = r.min_qty <= qty <= r.max_qty
    reasons, bad = [], []
    (reasons if ok_m else bad).append(f"Accepts {material}" if ok_m else f"Does not accept {material}")
    (reasons if ok_c else bad).append(f"Located in {r.city.strip()}" if ok_c else f"Located in {r.city.strip()}, listing is in {city.strip()}")
    rng = f"{r.min_qty:g}-{r.max_qty:g} kg"
    (reasons if ok_q else bad).append(f"{qty:g} kg is within {rng}" if ok_q else f"{qty:g} kg is outside accepted range {rng}")
    eligible = ok_m and ok_c and ok_q
    comp = {"material": W_MATERIAL if ok_m else 0, "city": W_CITY if ok_c else 0,
            "quantity": quantity_score(qty, r.min_qty, r.max_qty) if ok_q else 0.0}
    score = round(sum(comp.values()), 2) if eligible else 0.0
    return {"recycler_id": r.id, "business_name": r.name, "city": r.city, "eligible": eligible,
            "match_score": score, "score_components": comp if eligible else {"material": 0, "city": 0, "quantity": 0},
            "eligibility_reasons": reasons if eligible else [], "ineligibility_reasons": bad}

def rank(material: str, qty: float, city: str, recyclers: list) -> list:
    res = [evaluate(material, qty, city, r) for r in recyclers]
    return sorted(res, key=lambda x: (not x["eligible"], -x["match_score"], x["business_name"]))
