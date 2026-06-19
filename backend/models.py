"""SQLAlchemy ORM models."""

from datetime import datetime, timezone

from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from db import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=_utcnow)

    # Deleting a user removes their saved trips (ORM-level cascade).
    itineraries = relationship(
        "Itinerary", back_populates="user", cascade="all, delete-orphan"
    )


class Itinerary(Base):
    """A saved, geocoded trip plan owned by a user.

    The generated stops are stored verbatim as JSON (the same shape the
    /itinerary endpoint returns) — they're a denormalised snapshot, not
    queried relationally, so a JSON column keeps it simple.
    """

    __tablename__ = "itineraries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    city = Column(String, nullable=False)
    days = Column(Integer, nullable=False)
    stops = Column(JSON, nullable=False)
    created_at = Column(DateTime, nullable=False, default=_utcnow)

    user = relationship("User", back_populates="itineraries")

    @property
    def stop_count(self) -> int:
        return len(self.stops)
