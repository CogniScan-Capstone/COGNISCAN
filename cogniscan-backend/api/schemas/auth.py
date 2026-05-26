from datetime import date
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class ProfilePasienCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    nama_lengkap: str = Field(..., min_length=3, max_length=150)
    jenis_kelamin: Literal["laki-laki", "perempuan"]
    tanggal_lahir: date
    alamat_lengkap: str = Field(..., min_length=5, max_length=500)
    no_hp_wa: str = Field(..., min_length=8, max_length=20, pattern=r"^\+?[0-9]{8,20}$")

    @field_validator("tanggal_lahir")
    @classmethod
    def validate_tanggal_lahir(cls, value: date) -> date:
        if value > date.today():
            raise ValueError("Tanggal lahir tidak boleh di masa depan")
        return value


class ProfilePasienUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    nama_lengkap: Optional[str] = Field(default=None, min_length=3)
    jenis_kelamin: Optional[Literal["laki-laki", "perempuan"]] = None
    tanggal_lahir: Optional[date] = None
    alamat_lengkap: Optional[str] = Field(default=None, min_length=5, max_length=500)
    no_hp_wa: Optional[str] = Field(
        default=None,
        min_length=8,
        max_length=20,
        pattern=r"^\+?[0-9]{8,20}$",
    )

    @field_validator("tanggal_lahir")
    @classmethod
    def validate_tanggal_lahir(cls, value: date | None) -> date | None:
        if value is not None and value > date.today():
            raise ValueError("Tanggal lahir tidak boleh di masa depan")
        return value

    @model_validator(mode="after")
    def reject_required_nulls(self) -> "ProfilePasienUpdate":
        for field_name in (
            "nama_lengkap",
            "jenis_kelamin",
            "tanggal_lahir",
            "alamat_lengkap",
            "no_hp_wa",
        ):
            if field_name in self.model_fields_set and getattr(self, field_name) is None:
                raise ValueError("Field profil wajib tidak boleh dikosongkan")
        return self


class ProfilePasienResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_pasien: int
    id_pengguna: Optional[UUID] = None
    nama_lengkap: str
    jenis_kelamin: Optional[str] = None
    tanggal_lahir: Optional[date] = None
    alamat_lengkap: Optional[str] = None
    no_hp_wa: Optional[str] = None


class ProfilePsikologCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr
    nama_lengkap: str = Field(..., min_length=3, max_length=150)
    nomor_hp: str = Field(..., min_length=8, max_length=20, pattern=r"^\+?[0-9]{8,20}$")
    spesialisasi: str = Field(..., min_length=3, max_length=120)
    pengalaman_tahun: int = Field(..., ge=0, le=80)
    universitas_asal: str = Field(..., min_length=3, max_length=150)
    tahun_lulus: int = Field(..., ge=1950)
    alamat_praktik: str = Field(..., min_length=5, max_length=500)
    kota: str = Field(..., min_length=2, max_length=120)
    provinsi: str = Field(..., min_length=2, max_length=120)
    tarif_konsultasi: Decimal = Field(..., gt=0)
    no_str: str = Field(..., min_length=3)
    no_sip: str = Field(..., min_length=3)
    tgl_kadaluarsa_str: date
    tgl_kadaluarsa_sip: date
    upload_dokumen_str: str = Field(..., min_length=3, max_length=255)
    upload_dokumen_sip: str = Field(..., min_length=3, max_length=255)
    bio_singkat: str = Field(..., min_length=20, max_length=1000)

    @field_validator("tahun_lulus")
    @classmethod
    def validate_tahun_lulus(cls, value: int) -> int:
        if value > date.today().year:
            raise ValueError("Tahun lulus tidak boleh di masa depan")
        return value

    @field_validator("tgl_kadaluarsa_str", "tgl_kadaluarsa_sip")
    @classmethod
    def validate_dokumen_aktif(cls, value: date) -> date:
        if value < date.today():
            raise ValueError("Tanggal kadaluarsa dokumen harus masih aktif")
        return value


class ProfilePsikologUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    nama_lengkap: Optional[str] = Field(default=None, min_length=3, max_length=150)
    nomor_hp: Optional[str] = Field(
        default=None,
        min_length=8,
        max_length=20,
        pattern=r"^\+?[0-9]{8,20}$",
    )
    spesialisasi: Optional[str] = Field(default=None, min_length=3, max_length=120)
    pengalaman_tahun: Optional[int] = Field(default=None, ge=0)
    universitas_asal: Optional[str] = Field(default=None, min_length=3, max_length=150)
    tahun_lulus: Optional[int] = Field(default=None, ge=1950)
    alamat_praktik: Optional[str] = Field(default=None, min_length=5, max_length=500)
    kota: Optional[str] = Field(default=None, min_length=2, max_length=120)
    provinsi: Optional[str] = Field(default=None, min_length=2, max_length=120)
    tarif_konsultasi: Optional[Decimal] = Field(default=None, gt=0)
    bio_singkat: Optional[str] = Field(default=None, min_length=20, max_length=1000)

    @field_validator("tahun_lulus")
    @classmethod
    def validate_tahun_lulus(cls, value: int | None) -> int | None:
        if value is not None and value > date.today().year:
            raise ValueError("Tahun lulus tidak boleh di masa depan")
        return value

    @model_validator(mode="after")
    def reject_required_nulls(self) -> "ProfilePsikologUpdate":
        for field_name in (
            "nama_lengkap",
            "nomor_hp",
            "spesialisasi",
            "pengalaman_tahun",
            "universitas_asal",
            "tahun_lulus",
            "alamat_praktik",
            "kota",
            "provinsi",
            "tarif_konsultasi",
            "bio_singkat",
        ):
            if field_name in self.model_fields_set and getattr(self, field_name) is None:
                raise ValueError("Field profil wajib tidak boleh dikosongkan")
        return self


class ProfilePsikologResponse(BaseModel):
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
    nama_lengkap: Optional[str] = None
    status_akun: Optional[str] = None
    apakah_sudah_ganti_password: Optional[bool] = None
    profile_lengkap: Optional[bool] = None
