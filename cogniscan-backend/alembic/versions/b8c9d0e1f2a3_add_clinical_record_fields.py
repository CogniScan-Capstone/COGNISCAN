"""Add clinical record fields to consultation results.

Revision ID: b8c9d0e1f2a3
Revises: a6b7c8d9e0f1
Create Date: 2026-06-01
"""

from collections.abc import Sequence

from alembic import op


revision: str = "b8c9d0e1f2a3"
down_revision: str | None = "a6b7c8d9e0f1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE hasil_konsultasi
        ADD COLUMN IF NOT EXISTS keluhan_utama TEXT
        """
    )
    op.execute(
        """
        ALTER TABLE hasil_konsultasi
        ADD COLUMN IF NOT EXISTS observasi_psikolog TEXT
        """
    )
    op.execute(
        """
        ALTER TABLE hasil_konsultasi
        ADD COLUMN IF NOT EXISTS asesmen_klinis TEXT
        """
    )
    op.execute(
        """
        ALTER TABLE hasil_konsultasi
        ADD COLUMN IF NOT EXISTS intervensi_diberikan TEXT
        """
    )
    op.execute(
        """
        ALTER TABLE hasil_konsultasi
        ADD COLUMN IF NOT EXISTS rencana_tindak_lanjut TEXT
        """
    )
    op.execute(
        """
        ALTER TABLE hasil_konsultasi
        ADD COLUMN IF NOT EXISTS tingkat_risiko TEXT
        """
    )
    op.execute(
        """
        ALTER TABLE hasil_konsultasi
        ADD COLUMN IF NOT EXISTS versi_format_rekam_medis TEXT
            DEFAULT 'rekam_medis_v1'
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE hasil_konsultasi
        DROP COLUMN IF EXISTS versi_format_rekam_medis
        """
    )
    op.execute(
        """
        ALTER TABLE hasil_konsultasi
        DROP COLUMN IF EXISTS tingkat_risiko
        """
    )
    op.execute(
        """
        ALTER TABLE hasil_konsultasi
        DROP COLUMN IF EXISTS rencana_tindak_lanjut
        """
    )
    op.execute(
        """
        ALTER TABLE hasil_konsultasi
        DROP COLUMN IF EXISTS intervensi_diberikan
        """
    )
    op.execute(
        """
        ALTER TABLE hasil_konsultasi
        DROP COLUMN IF EXISTS asesmen_klinis
        """
    )
    op.execute(
        """
        ALTER TABLE hasil_konsultasi
        DROP COLUMN IF EXISTS observasi_psikolog
        """
    )
    op.execute(
        """
        ALTER TABLE hasil_konsultasi
        DROP COLUMN IF EXISTS keluhan_utama
        """
    )
