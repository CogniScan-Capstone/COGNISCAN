"""add permintaan reschedule konsultasi table

Revision ID: e4f5a6b7c8d9
Revises: d3e4f5a6b7c8
Create Date: 2026-05-24
"""

from collections.abc import Sequence

from alembic import op


revision: str = "e4f5a6b7c8d9"
down_revision: str | None = "d3e4f5a6b7c8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS permintaan_reschedule_konsultasi (
            id_permintaan_reschedule SERIAL PRIMARY KEY,
            id_pemesanan_konsultasi INTEGER NOT NULL
                REFERENCES pemesanan_konsultasi(id_pemesanan_konsultasi)
                ON DELETE CASCADE,
            id_pasien INTEGER
                REFERENCES pasien(id_pasien),
            id_psikolog INTEGER
                REFERENCES psikolog(id_psikolog),
            alasan_pasien TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            catatan_psikolog TEXT,
            diminta_pada TIMESTAMPTZ DEFAULT now(),
            direspons_pada TIMESTAMPTZ
        )
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_permintaan_reschedule_booking
        ON permintaan_reschedule_konsultasi (id_pemesanan_konsultasi)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_permintaan_reschedule_psikolog_status
        ON permintaan_reschedule_konsultasi (id_psikolog, status)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_permintaan_reschedule_pasien_status
        ON permintaan_reschedule_konsultasi (id_pasien, status)
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_permintaan_reschedule_pasien_status")
    op.execute("DROP INDEX IF EXISTS idx_permintaan_reschedule_psikolog_status")
    op.execute("DROP INDEX IF EXISTS idx_permintaan_reschedule_booking")
    op.execute("DROP TABLE IF EXISTS permintaan_reschedule_konsultasi")
