"""add reminder konsultasi table

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
Create Date: 2026-05-22
"""

from collections.abc import Sequence

from alembic import op


revision: str = "d3e4f5a6b7c8"
down_revision: str | None = "c2d3e4f5a6b7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS reminder_konsultasi (
            id_reminder_konsultasi SERIAL PRIMARY KEY,
            id_pemesanan_konsultasi INTEGER NOT NULL
                REFERENCES pemesanan_konsultasi(id_pemesanan_konsultasi)
                ON DELETE CASCADE,
            tipe_reminder TEXT NOT NULL,
            channel TEXT NOT NULL DEFAULT 'whatsapp',
            status TEXT NOT NULL DEFAULT 'pending',
            dikirim_pada TIMESTAMPTZ,
            error_message TEXT,
            dibuat_pada TIMESTAMPTZ DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_reminder_konsultasi_booking_type_channel
        ON reminder_konsultasi (id_pemesanan_konsultasi, tipe_reminder, channel)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_reminder_konsultasi_status
        ON reminder_konsultasi (status)
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_reminder_konsultasi_status")
    op.execute("DROP INDEX IF EXISTS uq_reminder_konsultasi_booking_type_channel")
    op.execute("DROP TABLE IF EXISTS reminder_konsultasi")
