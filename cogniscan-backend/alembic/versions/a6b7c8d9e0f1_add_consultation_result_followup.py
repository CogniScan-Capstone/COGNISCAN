"""add consultation result and followup booking fields

Revision ID: a6b7c8d9e0f1
Revises: f5a6b7c8d9e0
Create Date: 2026-05-25
"""

from collections.abc import Sequence

from alembic import op


revision: str = "a6b7c8d9e0f1"
down_revision: str | None = "f5a6b7c8d9e0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE pemesanan_konsultasi
        ADD COLUMN IF NOT EXISTS id_booking_sebelumnya INTEGER
            REFERENCES pemesanan_konsultasi(id_pemesanan_konsultasi)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_pemesanan_booking_sebelumnya
        ON pemesanan_konsultasi (id_booking_sebelumnya)
        """
    )
    op.execute(
        """
        ALTER TABLE hasil_konsultasi
        ADD COLUMN IF NOT EXISTS pasien_hadir BOOLEAN DEFAULT TRUE
        """
    )
    op.execute(
        """
        ALTER TABLE hasil_konsultasi
        ADD COLUMN IF NOT EXISTS ringkasan_untuk_pasien TEXT
        """
    )
    op.execute(
        """
        ALTER TABLE hasil_konsultasi
        ADD COLUMN IF NOT EXISTS catatan_internal TEXT
        """
    )
    op.execute(
        """
        ALTER TABLE hasil_konsultasi
        ADD COLUMN IF NOT EXISTS perlu_sesi_lanjutan BOOLEAN DEFAULT FALSE
        """
    )
    op.execute(
        """
        ALTER TABLE hasil_konsultasi
        ADD COLUMN IF NOT EXISTS diperbarui_pada TIMESTAMPTZ
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_hasil_konsultasi_booking
        ON hasil_konsultasi (id_pemesanan_konsultasi)
        WHERE id_pemesanan_konsultasi IS NOT NULL
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_hasil_konsultasi_booking")
    op.execute(
        """
        ALTER TABLE hasil_konsultasi
        DROP COLUMN IF EXISTS diperbarui_pada
        """
    )
    op.execute(
        """
        ALTER TABLE hasil_konsultasi
        DROP COLUMN IF EXISTS perlu_sesi_lanjutan
        """
    )
    op.execute(
        """
        ALTER TABLE hasil_konsultasi
        DROP COLUMN IF EXISTS catatan_internal
        """
    )
    op.execute(
        """
        ALTER TABLE hasil_konsultasi
        DROP COLUMN IF EXISTS ringkasan_untuk_pasien
        """
    )
    op.execute(
        """
        ALTER TABLE hasil_konsultasi
        DROP COLUMN IF EXISTS pasien_hadir
        """
    )
    op.execute("DROP INDEX IF EXISTS idx_pemesanan_booking_sebelumnya")
    op.execute(
        """
        ALTER TABLE pemesanan_konsultasi
        DROP COLUMN IF EXISTS id_booking_sebelumnya
        """
    )
