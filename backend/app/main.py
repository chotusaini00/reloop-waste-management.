import logging
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, Depends, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session
from . import services as svc
from .db import Base, engine, get_db, SessionLocal
from .models import Listing, Recycler, Supplier
from .schemas import ListingIn, RecyclerIn, RequestIn, StatusIn
from .seed import seed_demo
from .matching import MATERIALS

log = logging.getLogger("reloop")

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed_demo(db)
    yield

app = FastAPI(title="ReLoop API", version="1.0.0", lifespan=lifespan,
              description="Local hackathon MVP. Demo identity selection is NOT a security boundary.")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
                   allow_credentials=False, allow_methods=["GET", "POST", "PATCH"], allow_headers=["Content-Type"])

@app.exception_handler(svc.DomainError)
async def _domain(_: Request, e: svc.DomainError):
    return JSONResponse({"detail": e.message}, status_code=e.status)

@app.exception_handler(RequestValidationError)
async def _validation(_: Request, e: RequestValidationError):
    errs = [{"field": ".".join(str(p) for p in x["loc"][1:]) or "body", "message": x["msg"].replace("Value error, ", "")} for x in e.errors()]
    return JSONResponse({"detail": "Validation failed", "errors": errs}, status_code=422)

@app.exception_handler(Exception)
async def _unexpected(_: Request, e: Exception):
    log.exception("Unhandled error")
    return JSONResponse({"detail": "Internal server error"}, status_code=500)

@app.get("/api/health")
def health(): return {"status": "ok"}

@app.get("/api/meta")
def meta(): return {"materials": MATERIALS}

@app.get("/api/dashboard")
def dashboard(db: Session = Depends(get_db)): return svc.dashboard(db)

@app.get("/api/listings")
def listings(status: Optional[str] = None, material: Optional[str] = None, city: Optional[str] = None,
             min_qty: Optional[float] = Query(None, ge=0), max_qty: Optional[float] = Query(None, ge=0),
             q: Optional[str] = Query(None, max_length=100), supplier_id: Optional[int] = None,
             sort: str = "newest", page: int = Query(1, ge=1), page_size: int = Query(12, ge=1, le=100),
             db: Session = Depends(get_db)):
    return svc.query_listings(db, status, material, city, min_qty, max_qty, q, supplier_id, sort, page, page_size)

@app.post("/api/listings", status_code=201)
def add_listing(body: ListingIn, db: Session = Depends(get_db)):
    return svc.listing_out(svc.create_listing(db, body), db)

@app.get("/api/listings/{listing_id}")
def get_listing(listing_id: int, db: Session = Depends(get_db)):
    l = db.get(Listing, listing_id)
    if not l: raise svc.DomainError(404, "Listing not found")
    return svc.listing_out(l, db)

@app.get("/api/listings/{listing_id}/matches")
def matches(listing_id: int, recycler_id: Optional[int] = None, db: Session = Depends(get_db)):
    return svc.listing_matches(db, listing_id, recycler_id)

@app.get("/api/suppliers")
def suppliers(db: Session = Depends(get_db)):
    return [{"id": s.id, "name": s.name, "is_demo": s.is_demo} for s in db.scalars(select(Supplier).order_by(Supplier.name))]

@app.get("/api/recyclers")
def recyclers(db: Session = Depends(get_db)):
    return [svc.recycler_out(r) for r in db.scalars(select(Recycler).order_by(Recycler.name)).unique()]

@app.post("/api/recyclers", status_code=201)
def add_recycler(body: RecyclerIn, db: Session = Depends(get_db)):
    return svc.recycler_out(svc.create_recycler(db, body))

@app.get("/api/recyclers/{recycler_id}")
def get_recycler(recycler_id: int, db: Session = Depends(get_db)):
    r = db.get(Recycler, recycler_id)
    if not r: raise svc.DomainError(404, "Recycler not found")
    return svc.recycler_out(r)

@app.get("/api/recyclers/{recycler_id}/matches")
def recycler_matches(recycler_id: int, db: Session = Depends(get_db)):
    return svc.recycler_matches(db, recycler_id)

@app.get("/api/requests")
def requests_(supplier_id: Optional[int] = None, recycler_id: Optional[int] = None, listing_id: Optional[int] = None,
              status: Optional[str] = None, db: Session = Depends(get_db)):
    return svc.list_requests(db, supplier_id, recycler_id, listing_id, status)

@app.post("/api/requests", status_code=201)
def add_request(body: RequestIn, db: Session = Depends(get_db)):
    return svc.request_out(svc.create_request(db, body.listing_id, body.recycler_id))

@app.patch("/api/requests/{request_id}/status")
def set_status(request_id: int, body: StatusIn, db: Session = Depends(get_db)):
    return svc.request_out(svc.change_status(db, request_id, body.status, body.actor_role, body.actor_id))

@app.get("/api/impact")
def impact(db: Session = Depends(get_db)): return svc.impact(db)

@app.post("/api/demo/reset")
def demo_reset(db: Session = Depends(get_db)): return svc.reset_demo(db)

@app.get("/api/assistant/{material}")
def assistant(material: str):
    key = next((m for m in svc.KB if m.lower() == material.strip().lower()), None)
    if not key: raise svc.DomainError(404, "Unknown material")
    return {"material": key, **svc.KB[key], "disclaimer": svc.DISCLAIMER}
