from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID

class ProfilePasienCreate(BaseModel):
    email: EmailStr
    nama_lengkap: str = Field(..., min_length=3)
    no_hp_wa: Optional[str] = None
    jenis_kelamin: Optional[str] = None
    
class UserResponse(BaseModel):
    id: UUID
    email: str
    peran: str
    apakah_aktif: bool

    class Config:
        from_attributes = True
