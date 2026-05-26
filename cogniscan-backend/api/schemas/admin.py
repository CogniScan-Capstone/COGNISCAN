from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PsikologAdminResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_psikolog: int
    id_pengguna: Optional[UUID] = None
    nama_lengkap: str
    email: Optional[str] = None
    nomor_hp: Optional[str] = None
    nik: Optional[str] = None
    alamat_praktik: Optional[str] = None
    kota: Optional[str] = None
    provinsi: Optional[str] = None
    tarif_konsultasi: Optional[Decimal] = None
    no_str: Optional[str] = None
    no_sip: Optional[str] = None
    upload_dokumen_str: Optional[str] = None
    upload_dokumen_sip: Optional[str] = None
    status_akun: Optional[str] = None
    apakah_sudah_ganti_password: Optional[bool] = None
    dibuat_pada: Optional[datetime] = None
    nama_bank: Optional[str] = None
    nomor_rekening: Optional[str] = None
    nama_penerima_rekening: Optional[str] = None
    apakah_rekening_terverifikasi: Optional[bool] = None


class PsikologApproveResponse(BaseModel):
    id_psikolog: int
    email: str
    status_akun: str
    apakah_sudah_ganti_password: bool
    message: str


class PsikologRejectRequest(BaseModel):
    alasan: str = Field(..., min_length=5, max_length=1000)


class PsikologRejectResponse(BaseModel):
    id_psikolog: int
    email: Optional[str] = None
    status_akun: str
    message: str
