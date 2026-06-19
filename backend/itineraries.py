"""Trip-history endpoints: save, list, fetch, and delete a user's itineraries.

Routes live under ``/itineraries`` and all require a valid Bearer token — each
operation is scoped to the authenticated user, so one account can never see or
delete another's trips. Unauthorised access to an existing trip returns 404
(not 403) so the API never confirms that an id belongs to someone else.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth import get_current_user
from db import get_db
from models import Itinerary, User

router = APIRouter(prefix="/itineraries", tags=["itineraries"])


# --------------------------------------------------------------------------- #
# Schemas
# --------------------------------------------------------------------------- #
class Stop(BaseModel):
    """A single stop — mirrors what /itinerary returns. lat/lng may be null."""

    day: int
    order: int
    name: str
    description: str
    duration_minutes: int
    category: str
    lat: float | None = None
    lng: float | None = None


class ItineraryCreate(BaseModel):
    city: str = Field(..., min_length=1)
    days: int = Field(..., ge=1, le=14)
    stops: list[Stop] = Field(..., min_length=1)


class ItinerarySummary(BaseModel):
    """Lightweight list item — omits the stops to keep history responses small."""

    id: int
    city: str
    days: int
    stop_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ItineraryOut(ItinerarySummary):
    stops: list[Stop]


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _get_owned(itinerary_id: int, user: User, db: Session) -> Itinerary:
    """Fetch a trip the caller owns, or 404 (also covers other users' trips)."""
    record = db.get(Itinerary, itinerary_id)
    if record is None or record.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Itinerary not found"
        )
    return record


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #
@router.post("", response_model=ItineraryOut, status_code=status.HTTP_201_CREATED)
def create_itinerary(
    payload: ItineraryCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = Itinerary(
        user_id=user.id,
        city=payload.city,
        days=payload.days,
        stops=[stop.model_dump() for stop in payload.stops],
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("", response_model=list[ItinerarySummary])
def list_itineraries(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Itinerary)
        .filter(Itinerary.user_id == user.id)
        .order_by(Itinerary.created_at.desc(), Itinerary.id.desc())
        .all()
    )


@router.get("/{itinerary_id}", response_model=ItineraryOut)
def get_itinerary(
    itinerary_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _get_owned(itinerary_id, user, db)


@router.delete("/{itinerary_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_itinerary(
    itinerary_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.delete(_get_owned(itinerary_id, user, db))
    db.commit()
