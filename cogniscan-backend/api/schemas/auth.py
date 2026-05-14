from datetime import date
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ProfilePasienCreate(BaseModel):
    nama_lengkap: str = Field(..., min_length=3)
    jenis_kelamin: Optional[Literal["laki-laki", "perempuan"]] = None
    tanggal_lahir: Optional[date] = None
    alamat_lengkap: Optional[str] = None
    no_hp_wa: Optional[str] = None


class ProfilePsikologCreate(BaseModel):
    email: EmailStr
    nama_lengkap: str = Field(..., min_length=3, max_length=150)
    nomor_hp: Optional[str] = None
    spesialisasi: Optional[str] = None
    pengalaman_tahun: Optional[int] = Field(default=None, ge=0)
    universitas_asal: Optional[str] = None
    tahun_lulus: Optional[int] = Field(default=None, ge=1950)
    alamat_praktik: Optional[str] = None
    kota: Optional[str] = None
    provinsi: Optional[str] = None
    tarif_konsultasi: Optional[Decimal] = Field(default=None, ge=0)
    no_str: str = Field(..., min_length=3)
    no_sip: str = Field(..., min_length=3)
    tgl_kadaluarsa_str: Optional[date] = None
    tgl_kadaluarsa_sip: Optional[date] = None
    upload_dokumen_str: Optional[str] = None
    upload_dokumen_sip: Optional[str] = None
    bio_singkat: Optional[str] = None


class PsikologRegistrationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_psikolog: int
    email: Optional[str] = None
    nama_lengkap: str
    status_akun: Optional[str] = None


class ChangeTemporaryPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=12, max_length=128)


class MessageResponse(BaseModel):
    message: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    peran: Optional[str] = None
    apakah_aktif: Optional[bool] = None
