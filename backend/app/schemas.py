from typing import Literal, Optional
from pydantic import BaseModel, Field, field_validator, model_validator

Material = Literal["Plastic", "Paper", "Metal", "Glass", "Electronic waste", "Organic waste"]

class ListingIn(BaseModel):
    supplier_name: str = Field(min_length=1, max_length=80)
    material: Material
    quantity_kg: float = Field(gt=0, le=1_000_000)
    city: str = Field(min_length=1, max_length=60)
    price_per_kg: Optional[float] = Field(default=None, ge=0, le=100_000)
    description: str = Field(default="", max_length=500)

    @field_validator("supplier_name", "city", "description")
    @classmethod
    def _strip(cls, v: str):
        return v.strip()

    @model_validator(mode="after")
    def _nonblank(self):
        if not self.supplier_name or not self.city:
            raise ValueError("supplier_name and city must not be blank")
        return self

class RecyclerIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    city: str = Field(min_length=1, max_length=60)
    materials: list[Material] = Field(min_length=1)
    min_quantity_kg: float = Field(gt=0, le=1_000_000)
    max_quantity_kg: float = Field(gt=0, le=1_000_000)
    radius_km: Optional[float] = Field(default=None, gt=0, le=2000)

    @field_validator("name", "city")
    @classmethod
    def _strip(cls, v: str):
        return v.strip()

    @model_validator(mode="after")
    def _check(self):
        if not self.name or not self.city:
            raise ValueError("name and city must not be blank")
        if self.max_quantity_kg < self.min_quantity_kg:
            raise ValueError("max_quantity_kg must be >= min_quantity_kg")
        self.materials = list(dict.fromkeys(self.materials))
        return self

class RequestIn(BaseModel):
    listing_id: int
    recycler_id: int

class StatusIn(BaseModel):
    status: Literal["accepted", "rejected", "completed"]
    actor_role: Literal["supplier", "recycler"]
    actor_id: int
