import pytest
from app.matching import RecyclerProfile, evaluate, rank, quantity_score

R = RecyclerProfile(1, "Eco", " Delhi ", ["Plastic", "Metal"], 100, 1000)

def test_eligible_full_score_at_midpoint():
    r = evaluate("Plastic", 550, "delhi", R)
    assert r["eligible"] and r["match_score"] == 100 and r["score_components"] == {"material": 50, "city": 20, "quantity": 30}

def test_city_ignores_case_and_whitespace():
    assert evaluate("Plastic", 550, "  DELHI  ", R)["eligible"]

def test_material_mismatch():
    r = evaluate("Glass", 550, "Delhi", R)
    assert not r["eligible"] and r["match_score"] == 0 and r["ineligibility_reasons"]

def test_city_mismatch():
    assert not evaluate("Plastic", 550, "Noida", R)["eligible"]

@pytest.mark.parametrize("q,ok", [(99.9, False), (100, True), (1000, True), (1000.1, False)])
def test_quantity_boundaries(q, ok):
    assert evaluate("Plastic", q, "Delhi", R)["eligible"] is ok

def test_edge_quantity_score_is_lower():
    assert evaluate("Plastic", 100, "Delhi", R)["match_score"] == 70
    assert quantity_score(325, 100, 1000) == pytest.approx(30 * (1 - 225 / 450))

def test_zero_width_range_no_division_error():
    r = RecyclerProfile(2, "X", "Delhi", ["Paper"], 50, 50)
    assert evaluate("Paper", 50, "Delhi", r)["match_score"] == 100

@pytest.mark.parametrize("q", [0, -5, None])
def test_invalid_quantity(q):
    with pytest.raises(ValueError): evaluate("Plastic", q, "Delhi", R)

def test_invalid_range():
    with pytest.raises(ValueError): evaluate("Plastic", 5, "Delhi", RecyclerProfile(3, "B", "Delhi", ["Plastic"], 10, 5))

def test_rank_sorts_eligible_first_by_score():
    a = RecyclerProfile(1, "A", "Delhi", ["Plastic"], 100, 1000)
    b = RecyclerProfile(2, "B", "Delhi", ["Plastic"], 400, 700)
    c = RecyclerProfile(3, "C", "Noida", ["Plastic"], 100, 1000)
    out = rank("Plastic", 550, "Delhi", [c, a, b])
    assert [x["recycler_id"] for x in out][:2] == [1, 2] or [x["recycler_id"] for x in out][:2] == [2, 1]
    assert out[-1]["recycler_id"] == 3 and not out[-1]["eligible"]
    assert out[0]["match_score"] >= out[1]["match_score"]
