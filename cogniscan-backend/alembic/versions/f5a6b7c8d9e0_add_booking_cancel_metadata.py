"""add booking cancel metadata

Revision ID: f5a6b7c8d9e0
Revises: e4f5a6b7c8d9
Create Date: 2026-05-25
"""

from collections.abc import Sequence

from alembic import op


revision: str = "f5a6b7c8d9e0"
down_revision: str | None = "e4f5a6b7c8d9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE pemesanan_konsultasi
        ADD COLUMN IF NOT EXISTS alasan_pembatalan_pasien TEXT
        """
    )
    op.execute(
        """
        ALTER TABLE pemesanan_konsultasi
        ADD COLUMN IF NOT EXISTS dibatalkan_pada TIMESTAMPTZ
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE pemesanan_konsultasi
        DROP COLUMN IF EXISTS dibatalkan_pada
        """
    )
    op.execute(
        """
        ALTER TABLE pemesanan_konsultasi
        DROP COLUMN IF EXISTS alasan_pembatalan_pasien
        """
    )
