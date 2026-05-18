import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from api.models.log_persetujuan import LogPersetujuan
from api.models.pasien import Pasien
from api.models.pengguna import Pengguna
from api.models.psikolog import Psikolog
from api.schemas.auth import (
    ProfilePasienCreate,
    ProfilePasienUpdate,
    ProfilePsikologCreate,
    ProfilePsikologUpdate,
)
from api.services.supabase_auth_admin import (
    SupabaseAuthAdminError,
    update_user_password,
)


async def create_pasien_profile(
    db: AsyncSession,
    user_id: uuid.UUID,
    email: str,
    profile_data: ProfilePasienCreate,
) -> Pengguna:
    """
    Membuat profil Pengguna dan Pasien di database backend setelah
    user berhasil mendaftar (sign up) di Supabase Auth.

    `user_id` dan `email` diambil dari klaim JWT Supabase (bukan dari body),
    sehingga tidak bisa dipalsukan dari sisi frontend.
    """
    stmt = select(Pengguna).where(Pengguna.id == user_id)
    result = await db.execute(stmt)
    existing_user = result.scalar_one_or_none()

    if existing_user:
        if existing_user.email != email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token dan profil pengguna tidak cocok",
            )

        if existing_user.peran != "pasien":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Pengguna sudah terdaftar dengan role berbeda",
            )

        existing_pasien = await db.execute(
            select(Pasien).where(Pasien.id_pengguna == existing_user.id)
        )
        pasien = existing_pasien.scalar_one_or_none()

        if pasien is None:
            db.add(
                Pasien(
                    id_pengguna=existing_user.id,
                    nama_lengkap=profile_data.nama_lengkap,
                    jenis_kelamin=profile_data.jenis_kelamin,
                    tanggal_lahir=profile_data.tanggal_lahir,
                    alamat_lengkap=profile_data.alamat_lengkap,
                    no_hp_wa=profile_data.no_hp_wa,
                )
            )
            await db.commit()
            await db.refresh(existing_user)
            return existing_user

        update_data = profile_data.model_dump(exclude_unset=True)
        for field_name, value in update_data.items():
            current_value = getattr(pasien, field_name)
            if current_value is None and value is not None:
                setattr(pasien, field_name, value)

        await db.commit()
        await db.refresh(existing_user)
        return existing_user

    stmt_email = select(Pengguna).where(Pengguna.email == email)
    result_email = await db.execute(stmt_email)
    existing_email_user = result_email.scalar_one_or_none()
    if existing_email_user:
        if existing_email_user.peran != "pasien":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email sudah terdaftar dengan role berbeda",
            )

        existing_pasien = await db.execute(
            select(Pasien).where(Pasien.id_pengguna == existing_email_user.id)
        )
        if existing_pasien.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email sudah terdaftar di sistem",
            )

        existing_consent = await db.execute(
            select(LogPersetujuan).where(
                LogPersetujuan.id_pengguna == existing_email_user.id
            )
        )
        if existing_consent.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Email masih punya data persetujuan lama. Hapus row lama "
                    "di tabel pengguna/log_persetujuan untuk signup ulang."
                ),
            )

        # Repair akun test yang Supabase Auth-nya pernah dihapus, tetapi row
        # `pengguna` lama masih tertinggal tanpa profil pasien.
        existing_email_user.id = user_id
        existing_email_user.apakah_aktif = True
        db.add(
            Pasien(
                id_pengguna=user_id,
                nama_lengkap=profile_data.nama_lengkap,
                jenis_kelamin=profile_data.jenis_kelamin,
                tanggal_lahir=profile_data.tanggal_lahir,
                alamat_lengkap=profile_data.alamat_lengkap,
                no_hp_wa=profile_data.no_hp_wa,
            )
        )
        await db.commit()
        await db.refresh(existing_email_user)
        return existing_email_user

    new_pengguna = Pengguna(
        id=user_id,
        email=email,
        peran="pasien",
        apakah_aktif=True,
    )
    db.add(new_pengguna)
    await db.flush()

    new_pasien = Pasien(
        id_pengguna=new_pengguna.id,
        nama_lengkap=profile_data.nama_lengkap,
        jenis_kelamin=profile_data.jenis_kelamin,
        tanggal_lahir=profile_data.tanggal_lahir,
        alamat_lengkap=profile_data.alamat_lengkap,
        no_hp_wa=profile_data.no_hp_wa,
    )
    db.add(new_pasien)
    await db.commit()
    await db.refresh(new_pengguna)

    return new_pengguna


async def update_pasien_profile(
    db: AsyncSession,
    current_user: Pengguna,
    profile_data: ProfilePasienUpdate,
) -> Pasien:
    """
    Update profil pasien milik user yang sedang login.

    Endpoint ini tidak mengubah data auth seperti email, password, role, atau
    status aktif pengguna. Perubahan dibatasi ke tabel `pasien`.
    """
    if current_user.peran != "pasien":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Endpoint ini hanya untuk pasien",
        )

    result = await db.execute(
        select(Pasien).where(Pasien.id_pengguna == current_user.id)
    )
    pasien = result.scalar_one_or_none()
    if pasien is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profil pasien tidak ditemukan",
        )

    update_data = profile_data.model_dump(exclude_unset=True)
    if "nama_lengkap" in update_data and update_data["nama_lengkap"] is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nama lengkap tidak boleh kosong",
        )

    for field_name, value in update_data.items():
        setattr(pasien, field_name, value)

    await db.commit()
    await db.refresh(pasien)
    return pasien


async def get_pasien_profile(
    db: AsyncSession,
    current_user: Pengguna,
) -> Pasien:
    """Ambil profil pasien milik user yang sedang login."""
    if current_user.peran != "pasien":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Endpoint ini hanya untuk pasien",
        )

    result = await db.execute(
        select(Pasien).where(Pasien.id_pengguna == current_user.id)
    )
    pasien = result.scalar_one_or_none()
    if pasien is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profil pasien tidak ditemukan",
        )

    return pasien


async def register_psikolog_candidate(
    db: AsyncSession,
    profile_data: ProfilePsikologCreate,
) -> Psikolog:
    """
    Mendaftarkan calon psikolog sebelum approval admin.

    Pada flow ini akun Supabase Auth belum dibuat. Psikolog hanya mengirim
    data dan dokumen verifikasi. Akun login baru dibuat saat admin approve,
    lalu temporary password dikirim lewat email.
    """
    email = profile_data.email.lower()

    existing_pengguna = await db.execute(select(Pengguna).where(Pengguna.email == email))
    if existing_pengguna.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email sudah terdaftar sebagai pengguna",
        )

    existing_psikolog = await db.execute(select(Psikolog).where(Psikolog.email == email))
    if existing_psikolog.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pendaftaran psikolog dengan email ini sudah ada",
        )

    psikolog = Psikolog(
        id_pengguna=None,
        nama_lengkap=profile_data.nama_lengkap,
        email=email,
        nomor_hp=profile_data.nomor_hp,
        spesialisasi=profile_data.spesialisasi,
        pengalaman_tahun=profile_data.pengalaman_tahun,
        universitas_asal=profile_data.universitas_asal,
        tahun_lulus=profile_data.tahun_lulus,
        alamat_praktik=profile_data.alamat_praktik,
        kota=profile_data.kota,
        provinsi=profile_data.provinsi,
        tarif_konsultasi=profile_data.tarif_konsultasi,
        no_str=profile_data.no_str,
        no_sip=profile_data.no_sip,
        tgl_kadaluarsa_str=profile_data.tgl_kadaluarsa_str,
        tgl_kadaluarsa_sip=profile_data.tgl_kadaluarsa_sip,
        upload_dokumen_str=profile_data.upload_dokumen_str,
        upload_dokumen_sip=profile_data.upload_dokumen_sip,
        bio_singkat=profile_data.bio_singkat,
        status_akun="pending",
        apakah_sudah_ganti_password=False,
    )

    db.add(psikolog)
    await db.commit()
    await db.refresh(psikolog)
    return psikolog


async def change_psikolog_temporary_password(
    db: AsyncSession,
    current_user: Pengguna,
    new_password: str,
) -> None:
    """
    Mengganti temporary password psikolog dan membuka akses fitur psikolog.

    User harus sudah login memakai temporary password Supabase, sehingga JWT
    valid dan `current_user.id` sama dengan Supabase Auth user id.
    """
    if current_user.peran != "psikolog":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Endpoint ini hanya untuk psikolog",
        )

    result = await db.execute(
        select(Psikolog).where(Psikolog.id_pengguna == current_user.id)
    )
    psikolog = result.scalar_one_or_none()
    if psikolog is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profil psikolog tidak ditemukan",
        )

    if psikolog.status_akun != "terverifikasi":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akun psikolog belum terverifikasi",
        )

    try:
        await update_user_password(user_id=current_user.id, new_password=new_password)
    except SupabaseAuthAdminError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gagal mengganti password Supabase Auth: {exc}",
        ) from exc

    psikolog.apakah_sudah_ganti_password = True
    await db.commit()


async def update_psikolog_profile(
    db: AsyncSession,
    current_user: Pengguna,
    profile_data: ProfilePsikologUpdate,
) -> Psikolog:
    """
    Update profil/praktik psikolog milik user yang sedang login.

    Field verifikasi seperti email, STR, SIP, dokumen, status akun, dan flag
    temporary password tidak bisa diubah lewat endpoint profil ini.
    """
    if current_user.peran != "psikolog":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Endpoint ini hanya untuk psikolog",
        )

    result = await db.execute(
        select(Psikolog).where(Psikolog.id_pengguna == current_user.id)
    )
    psikolog = result.scalar_one_or_none()
    if psikolog is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profil psikolog tidak ditemukan",
        )

    if psikolog.status_akun != "terverifikasi":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akun psikolog belum terverifikasi",
        )

    if not psikolog.apakah_sudah_ganti_password:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Psikolog wajib mengganti temporary password terlebih dahulu",
        )

    update_data = profile_data.model_dump(exclude_unset=True)
    if "nama_lengkap" in update_data and update_data["nama_lengkap"] is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nama lengkap tidak boleh kosong",
        )

    for field_name, value in update_data.items():
        setattr(psikolog, field_name, value)

    await db.commit()
    await db.refresh(psikolog)
    return psikolog
