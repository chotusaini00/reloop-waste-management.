from sqlalchemy import select, func
from sqlalchemy.orm import Session
from .models import Supplier, Recycler, RecyclerMaterial, Listing

SUPPLIERS = ["GreenMart Retail", "Sharma Packaging", "City Hospital Canteen", "TechNova Offices", "Campus Hostel Mess"]
RECYCLERS = [  # name, city, materials, min, max, radius
 ("EcoPlast Recyclers", "Delhi", ["Plastic", "Metal"], 100, 5000, 30),
 ("PaperCycle Co", "Delhi", ["Paper"], 50, 2000, 25),
 ("MetalWorks Recovery", "Noida", ["Metal", "Electronic waste"], 200, 10000, 40),
 ("ClearGlass Industries", "Roorkee", ["Glass"], 100, 3000, None),
 ("E-Waste Solutions", "Delhi", ["Electronic waste"], 20, 1000, 50),
 ("BioCompost Hub", "Aligarh", ["Organic waste"], 50, 4000, 20),
 ("BulkPlast Roorkee", "Roorkee", ["Plastic"], 2000, 20000, None),
]
LISTINGS = [  # supplier idx, material, qty, city, price, description
 (0, "Plastic", 800, "Delhi", 12.5, "Clean PET bottles, baled"),
 (0, "Paper", 400, "Delhi", 6, "Cardboard boxes from store deliveries"),
 (1, "Plastic", 3500, "Roorkee", 9, "Mixed HDPE packaging offcuts"),
 (1, "Metal", 1200, "Noida", 28, "Aluminium and steel scrap"),
 (2, "Organic waste", 900, "Aligarh", None, "Kitchen food waste, collected daily"),
 (3, "Electronic waste", 150, "Delhi", None, "Old laptops, monitors and cables"),
 (3, "Paper", 60, "Delhi", 5, "Shredded office paper"),
 (4, "Glass", 700, "Roorkee", 3, "Bottles and jars, rinsed"),
 (4, "Organic waste", 30, "Aligarh", None, "Small batch: below recycler minimum (shows exclusion)"),
 (2, "Glass", 500, "Delhi", 4, "No glass recycler in Delhi (shows city mismatch)"),
]

def seed_demo(db: Session) -> bool:
    """Idempotent: does nothing if demo data already exists."""
    if db.scalar(select(func.count()).select_from(Supplier).where(Supplier.is_demo == True)):  # noqa: E712
        return False
    sup = [Supplier(name=n, is_demo=True) for n in SUPPLIERS]; db.add_all(sup); db.flush()
    for n, c, ms, lo, hi, rad in RECYCLERS:
        r = Recycler(name=n, city=c, min_quantity_kg=lo, max_quantity_kg=hi, radius_km=rad, is_demo=True)
        r.materials = [RecyclerMaterial(material=m) for m in ms]; db.add(r)
    for si, m, q, c, p, d in LISTINGS:
        db.add(Listing(supplier_id=sup[si].id, material=m, quantity_kg=q, city=c, price_per_kg=p, description=d, is_demo=True))
    db.commit()
    return True
