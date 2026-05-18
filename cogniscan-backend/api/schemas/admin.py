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
    spesialisasi: Optional[str] = None
    pengalaman_tahun: Optional[int] = None
    universitas_asal: Optional[str] = None
    tahun_lulus: Optional[int] = None
    alamat_praktik: Optional[str] = None
    kota: Optional[str] = None
    provinsi: Optional[str] = None
    tarif_konsultasi: Optional[Decimal] = None
    no_str: Optional[str] = None
    no_sip: Optional[str] = None
    tgl_kadaluarsa_str: Optional[date] = None
    tgl_kadaluarsa_sip: Optional[date] = None
    upload_dokumen_str: Optional[str] = None
    upload_dokumen_sip: Optional[str] = None
    bio_singkat: Optional[str] = None
    status_akun: Optional[str] = None
    apakah_sudah_ganti_password: Optional[bool] = None
    dibuat_pada: Optional[datetime] = None


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
