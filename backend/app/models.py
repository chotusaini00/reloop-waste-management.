from datetime import datetime, timezone
from sqlalchemy import (ForeignKey, String, Float, Boolean, DateTime, Index, UniqueConstraint,
                        CheckConstraint, Text, text)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base

def utcnow(): return datetime.now(timezone.utc).replace(tzinfo=None)

class Supplier(Base):
    __tablename__ = "suppliers"
    __table_args__ = (UniqueConstraint("name", "is_demo"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

class Recycler(Base):
    __tablename__ = "recyclers"
    __table_args__ = (CheckConstraint("max_quantity_kg >= min_quantity_kg"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    city: Mapped[str] = mapped_column(String(60), index=True)
    min_quantity_kg: Mapped[float] = mapped_column(Float)
    max_quantity_kg: Mapped[float] = mapped_column(Float)
    radius_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)
    materials: Mapped[list["RecyclerMaterial"]] = relationship(cascade="all, delete-orphan", lazy="selectin")

class RecyclerMaterial(Base):
    __tablename__ = "recycler_materials"
    recycler_id: Mapped[int] = mapped_column(ForeignKey("recyclers.id", ondelete="CASCADE"), primary_key=True)
    material: Mapped[str] = mapped_column(String(30), primary_key=True)

class Listing(Base):
    __tablename__ = "listings"
    __table_args__ = (CheckConstraint("quantity_kg > 0"), CheckConstraint("price_per_kg IS NULL OR price_per_kg >= 0"),
                      Index("ix_listing_filter", "status", "material", "city"))
    id: Mapped[int] = mapped_column(primary_key=True)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.id"), index=True)
    material: Mapped[str] = mapped_column(String(30))
    quantity_kg: Mapped[float] = mapped_column(Float)
    city: Mapped[str] = mapped_column(String(60))
    price_per_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="available")  # available|reserved|completed
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    supplier: Mapped[Supplier] = relationship(lazy="joined")

class CollectionRequest(Base):
    __tablename__ = "collection_requests"
    __table_args__ = (
        # one active (pending/accepted) request per recycler+listing
        Index("uq_active_request", "listing_id", "recycler_id", unique=True,
              sqlite_where=text("status IN ('pending','accepted')")),
        # at most one accepted request per listing
        Index("uq_one_accepted", "listing_id", unique=True, sqlite_where=text("status = 'accepted'")),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("listings.id"), index=True)
    recycler_id: Mapped[int] = mapped_column(ForeignKey("recyclers.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    listing: Mapped[Listing] = relationship(lazy="joined")
    recycler: Mapped[Recycler] = relationship(lazy="joined")
