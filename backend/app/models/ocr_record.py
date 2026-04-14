from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from ..db.base import Base


class OCRRecord(Base):
    __tablename__ = "ocr_records"
    __table_args__ = (UniqueConstraint("file", "page", name="uq_ocr_records_file_page"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    file: Mapped[str] = mapped_column(String(512), nullable=False, index=True)
    page: Mapped[int] = mapped_column(Integer, nullable=False, default=1, index=True)

    name_hindi: Mapped[str | None] = mapped_column(Text)
    name_english: Mapped[str | None] = mapped_column(Text)
    age: Mapped[str | None] = mapped_column(String(64))
    sex: Mapped[str | None] = mapped_column(String(32))
    location: Mapped[str | None] = mapped_column(Text)
    date: Mapped[str | None] = mapped_column(String(64))
    test_type: Mapped[str | None] = mapped_column(String(128))
    result: Mapped[str | None] = mapped_column(Text)
    pathogen: Mapped[str | None] = mapped_column(String(128))
    treatment: Mapped[str | None] = mapped_column(Text)
    temperature: Mapped[str | None] = mapped_column(String(64))
    hb_level: Mapped[str | None] = mapped_column(String(64))
    rbs: Mapped[str | None] = mapped_column(String(64))
    bp: Mapped[str | None] = mapped_column(String(64))
    contacts: Mapped[str | None] = mapped_column(Text)
    special_notes: Mapped[str | None] = mapped_column(Text)
    ocr_status: Mapped[str | None] = mapped_column(String(32))

    # Backend metadata (does not change UI/workflow)
    job_id: Mapped[str | None] = mapped_column(String(64), index=True)
    file_type: Mapped[str | None] = mapped_column(String(128))
    file_size_bytes: Mapped[int | None] = mapped_column(Integer)
    model_used: Mapped[str | None] = mapped_column(String(256))
    latency_ms: Mapped[float | None] = mapped_column(Float)
    prompt_tokens: Mapped[int | None] = mapped_column(Integer)
    completion_tokens: Mapped[int | None] = mapped_column(Integer)
    total_tokens: Mapped[int | None] = mapped_column(Integer)

    extracted_at: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
