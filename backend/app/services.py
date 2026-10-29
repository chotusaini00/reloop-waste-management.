"""Business rules. Route handlers stay thin and call into here."""
from datetime import timedelta
from sqlalchemy import select, func, delete, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from .models import Supplier, Recycler, RecyclerMaterial, Listing, CollectionRequest, utcnow
from .matching import RecyclerProfile, evaluate, rank, MATERIALS

class DomainError(Exception):
    def __init__(self, status: int, message: str):
        self.status, self.message = status, message

def profile(r: Recycler) -> RecyclerProfile:
    return RecyclerProfile(r.id, r.name, r.city, [m.material for m in r.materials], r.min_quantity_kg, r.max_quantity_kg)

# ---------- serializers ----------
def listing_out(l: Listing, db: Session | None = None) -> dict:
    d = {"id": l.id, "supplier_id": l.supplier_id, "supplier_name": l.supplier.name, "material": l.material,
         "quantity_kg": l.quantity_kg, "city": l.city, "price_per_kg": l.price_per_kg, "description": l.description,
         "status": l.status, "is_demo": l.is_demo, "created_at": l.created_at.isoformat(),
         "completed_at": l.completed_at.isoformat() if l.completed_at else None}
    if db is not None:
        d["request_count"] = db.scalar(select(func.count()).select_from(CollectionRequest).where(CollectionRequest.listing_id == l.id))
    return d

def recycler_out(r: Recycler) -> dict:
    return {"id": r.id, "name": r.name, "city": r.city, "materials": sorted(m.material for m in r.materials),
            "min_quantity_kg": r.min_quantity_kg, "max_quantity_kg": r.max_quantity_kg, "radius_km": r.radius_km,
            "is_demo": r.is_demo, "created_at": r.created_at.isoformat()}

def request_out(q: CollectionRequest) -> dict:
    l = q.listing
    return {"id": q.id, "listing_id": q.listing_id, "recycler_id": q.recycler_id, "recycler_name": q.recycler.name,
            "supplier_id": l.supplier_id, "supplier_name": l.supplier.name, "material": l.material,
            "quantity_kg": l.quantity_kg, "city": l.city, "listing_status": l.status, "status": q.status,
            "is_demo": q.is_demo, "created_at": q.created_at.isoformat(),
            "completed_at": q.completed_at.isoformat() if q.completed_at else None}

# ---------- suppliers / listings ----------
def get_or_create_supplier(db: Session, name: str) -> Supplier:
    s = db.scalar(select(Supplier).where(func.lower(Supplier.name) == name.lower(), Supplier.is_demo == False))  # noqa: E712
    if not s:
        s = Supplier(name=name, is_demo=False); db.add(s); db.flush()
    return s

def create_listing(db: Session, data) -> Listing:
    s = get_or_create_supplier(db, data.supplier_name)
    l = Listing(supplier_id=s.id, material=data.material, quantity_kg=data.quantity_kg, city=data.city,
                price_per_kg=data.price_per_kg, description=data.description, is_demo=False)
    db.add(l); db.commit(); db.refresh(l)
    return l

def query_listings(db, status=None, material=None, city=None, min_qty=None, max_qty=None, q=None,
                   supplier_id=None, sort="newest", page=1, page_size=12):
    stmt = select(Listing).join(Supplier)
    if status: stmt = stmt.where(Listing.status == status)
    if material: stmt = stmt.where(Listing.material == material)
    if city: stmt = stmt.where(func.lower(Listing.city) == city.strip().lower())
    if min_qty is not None: stmt = stmt.where(Listing.quantity_kg >= min_qty)
    if max_qty is not None: stmt = stmt.where(Listing.quantity_kg <= max_qty)
    if supplier_id: stmt = stmt.where(Listing.supplier_id == supplier_id)
    if q:
        like = f"%{q.strip().lower()}%"
        stmt = stmt.where(or_(func.lower(Listing.description).like(like), func.lower(Supplier.name).like(like),
                              func.lower(Listing.material).like(like), func.lower(Listing.city).like(like)))
    order = {"newest": Listing.created_at.desc(), "quantity_desc": Listing.quantity_kg.desc(),
             "quantity_asc": Listing.quantity_kg.asc(), "price_asc": Listing.price_per_kg.asc()}.get(sort, Listing.created_at.desc())
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(order, Listing.id.desc()).offset((page - 1) * page_size).limit(page_size)).unique().all()
    return {"items": [listing_out(l, db) for l in rows], "total": total, "page": page, "page_size": page_size}

def listing_matches(db: Session, listing_id: int, recycler_id: int | None = None):
    l = db.get(Listing, listing_id)
    if not l: raise DomainError(404, "Listing not found")
    recs = db.scalars(select(Recycler)).unique().all()
    if recycler_id: recs = [r for r in recs if r.id == recycler_id]
    return rank(l.material, l.quantity_kg, l.city, [profile(r) for r in recs])

def recycler_matches(db: Session, recycler_id: int):
    r = db.get(Recycler, recycler_id)
    if not r: raise DomainError(404, "Recycler not found")
    p, out = profile(r), []
    for l in db.scalars(select(Listing).where(Listing.status == "available")).unique().all():
        m = evaluate(l.material, l.quantity_kg, l.city, p)
        if m["eligible"]:
            out.append({"listing": listing_out(l, db), "match": m})
    return sorted(out, key=lambda x: -x["match"]["match_score"])

# ---------- recyclers ----------
def create_recycler(db: Session, data) -> Recycler:
    r = Recycler(name=data.name, city=data.city, min_quantity_kg=data.min_quantity_kg,
                 max_quantity_kg=data.max_quantity_kg, radius_km=data.radius_km, is_demo=False)
    r.materials = [RecyclerMaterial(material=m) for m in data.materials]
    db.add(r); db.commit(); db.refresh(r)
    return r

# ---------- collection requests ----------
def create_request(db: Session, listing_id: int, recycler_id: int) -> CollectionRequest:
    l, r = db.get(Listing, listing_id), db.get(Recycler, recycler_id)
    if not l: raise DomainError(404, "Listing not found")
    if not r: raise DomainError(404, "Recycler not found")
    if l.status != "available": raise DomainError(409, f"Listing is {l.status} and cannot receive new requests")
    m = evaluate(l.material, l.quantity_kg, l.city, profile(r))
    if not m["eligible"]: raise DomainError(422, "Recycler is not eligible: " + "; ".join(m["ineligibility_reasons"]))
    dup = db.scalar(select(CollectionRequest.id).where(CollectionRequest.listing_id == l.id,
            CollectionRequest.recycler_id == r.id, CollectionRequest.status.in_(["pending", "accepted"])))
    if dup: raise DomainError(409, "An active request already exists for this recycler and listing")
    q = CollectionRequest(listing_id=l.id, recycler_id=r.id, status="pending", is_demo=False)
    db.add(q)
    try:
        db.commit()
    except IntegrityError:
        db.rollback(); raise DomainError(409, "An active request already exists for this recycler and listing")
    db.refresh(q)
    return q

TRANSITIONS = {"pending": {"accepted", "rejected"}, "accepted": {"completed"}}

def change_status(db: Session, request_id: int, new: str, role: str, actor_id: int) -> CollectionRequest:
    q = db.get(CollectionRequest, request_id)
    if not q: raise DomainError(404, "Request not found")
    l = q.listing
    if new not in TRANSITIONS.get(q.status, set()):
        raise DomainError(409, f"Invalid transition: {q.status} -> {new}")
    owner = role == "supplier" and actor_id == l.supplier_id
    requester = role == "recycler" and actor_id == q.recycler_id
    if new in ("accepted", "rejected") and not owner:
        raise DomainError(403, "Only the supplier who owns the listing can accept or reject requests")
    if new == "completed" and not (owner or requester):
        raise DomainError(403, "Only the listing owner or the requesting recycler can complete a collection")
    try:
        now = utcnow()
        if new == "accepted":
            if l.status != "available": raise DomainError(409, f"Listing is {l.status}")
            q.status, l.status = "accepted", "reserved"
            for o in db.scalars(select(CollectionRequest).where(CollectionRequest.listing_id == l.id,
                    CollectionRequest.id != q.id, CollectionRequest.status == "pending")).unique():
                o.status = "rejected"
        elif new == "rejected":
            q.status = "rejected"
        else:
            q.status, l.status, q.completed_at, l.completed_at = "completed", "completed", now, now
        db.commit()
    except DomainError:
        db.rollback(); raise
    except IntegrityError:
        db.rollback(); raise DomainError(409, "Conflicting update; please refresh and retry")
    db.refresh(q)
    return q

def list_requests(db, supplier_id=None, recycler_id=None, listing_id=None, status=None):
    stmt = select(CollectionRequest).join(Listing, CollectionRequest.listing_id == Listing.id)
    if supplier_id: stmt = stmt.where(Listing.supplier_id == supplier_id)
    if recycler_id: stmt = stmt.where(CollectionRequest.recycler_id == recycler_id)
    if listing_id: stmt = stmt.where(CollectionRequest.listing_id == listing_id)
    if status: stmt = stmt.where(CollectionRequest.status == status)
    return [request_out(q) for q in db.scalars(stmt.order_by(CollectionRequest.created_at.desc(), CollectionRequest.id.desc())).unique()]

# ---------- stats ----------
def _sum(db, *conds):
    return float(db.scalar(select(func.coalesce(func.sum(Listing.quantity_kg), 0.0)).where(*conds)) or 0)

def impact(db: Session) -> dict:
    completed = float(db.scalar(select(func.coalesce(func.sum(Listing.quantity_kg), 0.0))
                .join(CollectionRequest, CollectionRequest.listing_id == Listing.id)
                .where(CollectionRequest.status == "completed")) or 0)
    by_mat = db.execute(select(Listing.material, func.sum(Listing.quantity_kg))
                .join(CollectionRequest, CollectionRequest.listing_id == Listing.id)
                .where(CollectionRequest.status == "completed").group_by(Listing.material)).all()
    return {"total_listed_kg": _sum(db), "available_kg": _sum(db, Listing.status == "available"),
            "reserved_kg": _sum(db, Listing.status == "reserved"), "completed_collection_kg": completed,
            "completed_by_material": [{"material": m, "kg": float(k)} for m, k in by_mat],
            "carbon_estimate": None,
            "note": "Weights come from completed collection records only. 'Collected' does not mean 'verified recycled'. "
                    "No emissions factors are configured, so no carbon savings are claimed."}

def dashboard(db: Session) -> dict:
    cnt = lambda model, *c: db.scalar(select(func.count()).select_from(model).where(*c)) or 0
    dist = db.execute(select(Listing.material, func.sum(Listing.quantity_kg)).group_by(Listing.material)).all()
    today = utcnow().date(); days = [today - timedelta(days=i) for i in range(13, -1, -1)]
    created, done = {d: 0 for d in days}, {d: 0 for d in days}
    for q in db.scalars(select(CollectionRequest)).unique():
        if q.created_at.date() in created: created[q.created_at.date()] += 1
        if q.completed_at and q.completed_at.date() in done: done[q.completed_at.date()] += 1
    s = lambda status: cnt(CollectionRequest, CollectionRequest.status == status)
    recent_l = db.scalars(select(Listing).order_by(Listing.created_at.desc(), Listing.id.desc()).limit(5)).unique().all()
    return {"metrics": {"total_listed_kg": _sum(db), "available_listings": cnt(Listing, Listing.status == "available"),
                        "registered_recyclers": cnt(Recycler), "pending_requests": s("pending"),
                        "accepted_requests": s("accepted"), "completed_collections": s("completed")},
            "demo_vs_session": {"demo_listings": cnt(Listing, Listing.is_demo == True),  # noqa: E712
                                "session_listings": cnt(Listing, Listing.is_demo == False)},  # noqa: E712
            "material_distribution": [{"material": m, "kg": float(k)} for m, k in dist],
            "activity": [{"date": d.isoformat(), "requests": created[d], "completed": done[d]} for d in days],
            "recent_listings": [listing_out(l) for l in recent_l],
            "recent_requests": list_requests(db)[:5], "impact": impact(db)}

# ---------- demo reset ----------
def reset_demo(db: Session) -> dict:
    from .seed import seed_demo
    ids_l = select(Listing.id).where(Listing.is_demo == True)  # noqa: E712
    ids_r = select(Recycler.id).where(Recycler.is_demo == True)  # noqa: E712
    db.execute(delete(CollectionRequest).where(or_(CollectionRequest.is_demo == True,  # noqa: E712
               CollectionRequest.listing_id.in_(ids_l), CollectionRequest.recycler_id.in_(ids_r))))
    db.execute(delete(Listing).where(Listing.is_demo == True))  # noqa: E712
    db.execute(delete(RecyclerMaterial).where(RecyclerMaterial.recycler_id.in_(ids_r)))
    db.execute(delete(Recycler).where(Recycler.is_demo == True))  # noqa: E712
    db.execute(delete(Supplier).where(Supplier.is_demo == True))  # noqa: E712
    db.commit()
    seed_demo(db)
    return {"status": "ok", "message": "Demo records reset; your own records were kept."}

# ---------- recycling assistant (predefined knowledge base) ----------
KB = {
 "Plastic": {"tips": ["Check the resin code (1-7); many programmes only take 1 and 2.", "Rinse containers and remove food residue.", "Keep caps on or off as your local collector advises.", "Avoid mixing film/carry bags with rigid plastics."], "avoid": "Greasy food packaging and multi-layer pouches are often not accepted."},
 "Paper": {"tips": ["Keep paper dry and clean.", "Flatten cardboard boxes and remove tape where possible.", "Separate office paper from newspaper if your collector asks."], "avoid": "Wax-coated, heavily soiled, or laminated paper is usually not recyclable."},
 "Metal": {"tips": ["Rinse food cans.", "Aluminium and steel are usually separated by collectors.", "Scrap metal can often be sold by weight."], "avoid": "Aerosol cans and paint tins need special handling."},
 "Glass": {"tips": ["Rinse bottles and jars.", "Separate by colour if your collector requires it.", "Handle and pack carefully to avoid breakage."], "avoid": "Ceramics, mirrors and window glass melt differently and usually can't go with bottle glass."},
 "Electronic waste": {"tips": ["Use an authorised e-waste collector.", "Erase personal data from devices first.", "Keep batteries and cables with the device unless told otherwise."], "avoid": "Never put e-waste in general bins; it contains hazardous substances."},
 "Organic waste": {"tips": ["Keep organic waste separate from dry recyclables.", "Compost at home or hand over to a composting/biogas facility.", "Use covered containers to reduce smell and pests."], "avoid": "Avoid mixing with plastic bags; most composters don't accept them."},
}
DISCLAIMER = "General guidance from a built-in knowledge base (no external AI). Local recycling rules differ - always confirm with your local collector."
