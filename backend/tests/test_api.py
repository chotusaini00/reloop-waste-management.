from sqlalchemy import select, func
from app.db import SessionLocal
from app.models import Listing, Recycler

L = {"supplier_name": "Test Supplier", "material": "Plastic", "quantity_kg": 500, "city": "Delhi", "price_per_kg": 10, "description": "t"}
R = {"name": "Test Recycler", "city": "Delhi", "materials": ["Plastic"], "min_quantity_kg": 100, "max_quantity_kg": 1000}

def mk(client):
    l = client.post("/api/listings", json=L).json()
    r = client.post("/api/recyclers", json=R).json()
    return l, r

def patch(client, rid, status, role, aid):
    return client.patch(f"/api/requests/{rid}/status", json={"status": status, "actor_role": role, "actor_id": aid})

def test_health_and_tables(client):
    assert client.get("/api/health").json() == {"status": "ok"}
    assert client.get("/api/dashboard").status_code == 200

def test_seed_no_duplicates(client):
    from app.seed import seed_demo
    with SessionLocal() as db:
        before = db.scalar(select(func.count()).select_from(Listing))
        assert seed_demo(db) is False
        assert db.scalar(select(func.count()).select_from(Listing)) == before

def test_create_listing_and_validation(client):
    r = client.post("/api/listings", json=L)
    assert r.status_code == 201 and r.json()["status"] == "available"
    for bad in [{"quantity_kg": 0}, {"quantity_kg": -1}, {"price_per_kg": -2}, {"city": ""}, {"material": "Wood"}, {"description": "x" * 501}]:
        assert client.post("/api/listings", json={**L, **bad}).status_code == 422
    miss = {k: v for k, v in L.items() if k != "city"}
    r = client.post("/api/listings", json=miss)
    assert r.status_code == 422 and r.json()["errors"][0]["field"] == "city"

def test_recycler_register_and_validation(client):
    assert client.post("/api/recyclers", json=R).status_code == 201
    assert client.post("/api/recyclers", json={**R, "min_quantity_kg": 500, "max_quantity_kg": 100}).status_code == 422
    assert client.post("/api/recyclers", json={**R, "materials": []}).status_code == 422
    assert client.post("/api/recyclers", json={**R, "radius_km": -5}).status_code == 422

def test_matches_endpoint(client):
    l, r = mk(client)
    m = client.get(f"/api/listings/{l['id']}/matches").json()
    mine = next(x for x in m if x["recycler_id"] == r["id"])
    assert mine["eligible"] and m[0]["eligible"]
    assert any(not x["eligible"] and x["ineligibility_reasons"] for x in m)

def test_full_workflow(client):
    l, r = mk(client)
    q = client.post("/api/requests", json={"listing_id": l["id"], "recycler_id": r["id"]})
    assert q.status_code == 201 and q.json()["status"] == "pending"
    qid = q.json()["id"]
    assert client.post("/api/requests", json={"listing_id": l["id"], "recycler_id": r["id"]}).status_code == 409  # duplicate
    # other recycler's competing request
    r2 = client.post("/api/recyclers", json={**R, "name": "Second"}).json()
    q2 = client.post("/api/requests", json={"listing_id": l["id"], "recycler_id": r2["id"]}).json()
    # wrong supplier cannot act
    assert patch(client, qid, "accepted", "supplier", l["supplier_id"] + 999).status_code == 403
    assert patch(client, qid, "completed", "supplier", l["supplier_id"]).status_code == 409  # pending -> completed invalid
    assert patch(client, qid, "accepted", "supplier", l["supplier_id"]).json()["status"] == "accepted"
    assert client.get(f"/api/listings/{l['id']}").json()["status"] == "reserved"
    assert next(x for x in client.get(f"/api/requests?listing_id={l['id']}").json() if x["id"] == q2["id"])["status"] == "rejected"
    r3 = client.post("/api/recyclers", json={**R, "name": "Third"}).json()
    assert client.post("/api/requests", json={"listing_id": l["id"], "recycler_id": r3["id"]}).status_code == 409  # reserved
    before = client.get("/api/impact").json()["completed_collection_kg"]
    assert patch(client, qid, "completed", "recycler", r["id"]).json()["status"] == "completed"
    done = client.get(f"/api/listings/{l['id']}").json()
    assert done["status"] == "completed" and done["completed_at"]
    assert client.get("/api/impact").json()["completed_collection_kg"] == before + 500
    assert patch(client, qid, "rejected", "supplier", l["supplier_id"]).status_code == 409  # terminal
    assert patch(client, q2["id"], "accepted", "supplier", l["supplier_id"]).status_code == 409  # terminal

def test_reject_keeps_listing_available(client):
    l, r = mk(client)
    q = client.post("/api/requests", json={"listing_id": l["id"], "recycler_id": r["id"]}).json()
    assert patch(client, q["id"], "rejected", "supplier", l["supplier_id"]).json()["status"] == "rejected"
    assert client.get(f"/api/listings/{l['id']}").json()["status"] == "available"
    # after rejection a new request is allowed
    assert client.post("/api/requests", json={"listing_id": l["id"], "recycler_id": r["id"]}).status_code == 201

def test_ineligible_recycler_rejected(client):
    l, _ = mk(client)
    for bad in [{"materials": ["Glass"]}, {"city": "Noida"}, {"min_quantity_kg": 600, "max_quantity_kg": 900}]:
        r = client.post("/api/recyclers", json={**R, **bad}).json()
        assert client.post("/api/requests", json={"listing_id": l["id"], "recycler_id": r["id"]}).status_code == 422

def test_missing_records(client):
    assert client.get("/api/listings/999999").status_code == 404
    assert client.post("/api/requests", json={"listing_id": 999999, "recycler_id": 1}).status_code == 404
    assert patch(client, 999999, "accepted", "supplier", 1).status_code == 404

def test_db_unique_constraint_blocks_duplicates(client):
    import pytest
    from sqlalchemy.exc import IntegrityError
    from app.models import CollectionRequest
    l, r = mk(client)
    with SessionLocal() as db:
        db.add(CollectionRequest(listing_id=l["id"], recycler_id=r["id"], status="pending")); db.commit()
        db.add(CollectionRequest(listing_id=l["id"], recycler_id=r["id"], status="pending"))
        with pytest.raises(IntegrityError): db.commit()

def test_dashboard_reflects_changes(client):
    a = client.get("/api/dashboard").json()["metrics"]
    client.post("/api/listings", json=L); client.post("/api/recyclers", json=R)
    b = client.get("/api/dashboard").json()["metrics"]
    assert b["available_listings"] == a["available_listings"] + 1
    assert b["registered_recyclers"] == a["registered_recyclers"] + 1
    assert b["total_listed_kg"] == a["total_listed_kg"] + 500

def test_demo_reset_preserves_non_demo(client):
    l, r = mk(client)
    res = client.post("/api/demo/reset")
    assert res.status_code == 200
    assert client.get(f"/api/listings/{l['id']}").status_code == 200
    assert client.get(f"/api/recyclers/{r['id']}").status_code == 200
    d = client.get("/api/dashboard").json()["demo_vs_session"]
    assert d["demo_listings"] == 10  # re-seeded once, no duplicates
    assert client.post("/api/demo/reset").status_code == 200
    assert client.get("/api/dashboard").json()["demo_vs_session"]["demo_listings"] == 10

def test_assistant(client):
    assert "disclaimer" in client.get("/api/assistant/plastic").json()
    assert client.get("/api/assistant/wood").status_code == 404
