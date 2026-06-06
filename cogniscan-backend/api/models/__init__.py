"""
Central import untuk semua SQLAlchemy models.

PENTING: File ini HARUS import semua model agar Alembic autogenerate
bisa mendeteksi semua tabel saat generate migration.
"""

from api.core.database import Base  # noqa: F401

from api.models.pengguna import Pengguna  # noqa: F401
from api.models.pasien import Pasien  # noqa: F401
from api.models.psikolog import Psikolog  # noqa: F401
from api.models.admin import Admin  # noqa: F401
from api.models.log_persetujuan import LogPersetujuan  # noqa: F401
from api.models.sesi_jurnal import SesiJurnal  # noqa: F401
from api.models.jawaban_jurnal import JawabanJurnal  # noqa: F401
from api.models.pra_asesmen import PraAsesmen  # noqa: F401
from api.models.distorsi_terdeteksi import DistorsiTerdeteksi  # noqa: F401
from api.models.jadwal_psikolog import JadwalPsikolog  # noqa: F401
from api.models.pemesanan_konsultasi import PemesananKonsultasi  # noqa: F401
from api.models.hasil_konsultasi import HasilKonsultasi  # noqa: F401
from api.models.transaksi_pembayaran import TransaksiPembayaran  # noqa: F401
from api.models.reminder_konsultasi import ReminderKonsultasi  # noqa: F401
from api.models.permintaan_reschedule_konsultasi import PermintaanRescheduleKonsultasi  # noqa: F401
from api.models.audit_log import AuditLog  # noqa: F401
