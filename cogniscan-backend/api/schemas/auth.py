from datetime import date
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ProfilePasienCreate(BaseModel):
    nama_lengkap: str = Field(..., min_length=3)
    jenis_kelamin: Optional[Literal["laki-laki", "perempuan"]] = None
    tanggal_lahir: Optional[date] = None
    alamat_lengkap: Optional[str] = None
    no_hp_wa: Optional[str] = None


class UserResponse(BaseModel):
    id: UUID
    email: str
    peran: Optional[str] = None
    apakah_aktif: Optional[bool] = None

    class Config:
        from_attributes = True
