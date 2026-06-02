from datetime import date
from uuid import uuid4

import pytest
from fastapi import HTTPException

from api.dependencies.auth import (
    get_current_active_pasien,
    get_current_active_psikolog,
    has_complete_patient_profile,
    require_role,
)
from api.models.pasien import Pasien
from api.models.pengguna import Pengguna
from api.models.psikolog import Psikolog


class _ScalarResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class _FakeDb:
    def __init__(self, value):
        self.value = value

    async def execute(self, _query):
        return _ScalarResult(self.value)


def _user(role: str = "pasien") -> Pengguna:
    return Pengguna(
        id=uuid4(),
        email=f"{role}@example.test",
        peran=role,
        apakah_aktif=True,
    )


def _complete_patient() -> Pasien:
    return Pasien(
        id_pasien=1,
        nama_lengkap="Ayu Lestari",
        jenis_kelamin="perempuan",
        tanggal_lahir=date(2001, 1, 15),
        alamat_lengkap="Jalan Melati Nomor 10",
        no_hp_wa="6281234567890",
    )


def test_has_complete_patient_profile_requires_all_mvp_fields():
    assert has_complete_patient_profile(_complete_patient()) is True
    assert has_complete_patient_profile(None) is False

    missing_whatsapp = _complete_patient()
    missing_whatsapp.no_hp_wa = "   "
    assert has_complete_patient_profile(missing_whatsapp) is False

    invalid_gender = _complete_patient()
    invalid_gender.jenis_kelamin = "lainnya"
    assert has_complete_patient_profile(invalid_gender) is False

    missing_birth_date = _complete_patient()
    missing_birth_date.tanggal_lahir = None
    assert has_complete_patient_profile(missing_birth_date) is False


@pytest.mark.asyncio
async def test_require_role_allows_only_configured_roles():
    admin = _user("admin")
    pasien = _user("pasien")

    dependency = require_role("admin")

    assert await dependency(admin) is admin
    with pytest.raises(HTTPException) as exc_info:
        await dependency(pasien)

    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_active_patient_guard_rejects_wrong_role_and_incomplete_profile():
    with pytest.raises(HTTPException) as wrong_role:
        await get_current_active_pasien(_user("admin"), _FakeDb(_complete_patient()))
    assert wrong_role.value.status_code == 403

    incomplete_patient = _complete_patient()
    incomplete_patient.alamat_lengkap = ""
    with pytest.raises(HTTPException) as incomplete:
        await get_current_active_pasien(_user("pasien"), _FakeDb(incomplete_patient))

    assert incomplete.value.status_code == 403
    assert "Profil pasien belum lengkap" in incomplete.value.detail


@pytest.mark.asyncio
async def test_active_patient_guard_accepts_complete_patient_profile():
    current_user = _user("pasien")

    assert await get_current_active_pasien(current_user, _FakeDb(_complete_patient())) is current_user


@pytest.mark.asyncio
async def test_active_psikolog_guard_requires_verified_account_and_password_change():
    current_user = _user("psikolog")

    with pytest.raises(HTTPException) as missing_profile:
        await get_current_active_psikolog(current_user, _FakeDb(None))
    assert missing_profile.value.status_code == 403
    assert "Profil psikolog tidak ditemukan" in missing_profile.value.detail

    pending = Psikolog(
        id_psikolog=1,
        nama_lengkap="Psikolog Pending",
        status_akun="pending",
        apakah_sudah_ganti_password=True,
    )
    with pytest.raises(HTTPException) as not_verified:
        await get_current_active_psikolog(current_user, _FakeDb(pending))
    assert not_verified.value.status_code == 403
    assert "belum terverifikasi" in not_verified.value.detail

    temporary_password = Psikolog(
        id_psikolog=1,
        nama_lengkap="Psikolog Temporary",
        status_akun="terverifikasi",
        apakah_sudah_ganti_password=False,
    )
    with pytest.raises(HTTPException) as must_change_password:
        await get_current_active_psikolog(current_user, _FakeDb(temporary_password))
    assert must_change_password.value.status_code == 403
    assert "temporary password" in must_change_password.value.detail

    active = Psikolog(
        id_psikolog=1,
        nama_lengkap="Psikolog Aktif",
        status_akun="terverifikasi",
        apakah_sudah_ganti_password=True,
    )
    assert await get_current_active_psikolog(current_user, _FakeDb(active)) is current_user
