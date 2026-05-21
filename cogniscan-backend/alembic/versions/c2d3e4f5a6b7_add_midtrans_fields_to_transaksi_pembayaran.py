"""add midtrans fields to transaksi pembayaran

Revision ID: c2d3e4f5a6b7
Revises: b7c8d9e0f1a2
Create Date: 2026-05-21
"""

from collections.abc import Sequence

from alembic import op


revision: str = "c2d3e4f5a6b7"
down_revision: str | None = "b7c8d9e0f1a2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE transaksi_pembayaran ADD COLUMN IF NOT EXISTS midtrans_order_id TEXT")
    op.execute("ALTER TABLE transaksi_pembayaran ADD COLUMN IF NOT EXISTS midtrans_transaction_id TEXT")
    op.execute("ALTER TABLE transaksi_pembayaran ADD COLUMN IF NOT EXISTS midtrans_snap_token TEXT")
    op.execute("ALTER TABLE transaksi_pembayaran ADD COLUMN IF NOT EXISTS midtrans_redirect_url TEXT")
    op.execute("ALTER TABLE transaksi_pembayaran ADD COLUMN IF NOT EXISTS midtrans_payment_type TEXT")
    op.execute("ALTER TABLE transaksi_pembayaran ADD COLUMN IF NOT EXISTS midtrans_fraud_status TEXT")
    op.execute("ALTER TABLE transaksi_pembayaran ADD COLUMN IF NOT EXISTS midtrans_status_code TEXT")
    op.execute("ALTER TABLE transaksi_pembayaran ADD COLUMN IF NOT EXISTS midtrans_status_message TEXT")
    op.execute("ALTER TABLE transaksi_pembayaran ADD COLUMN IF NOT EXISTS midtrans_transaction_status TEXT")
    op.execute("ALTER TABLE transaksi_pembayaran ADD COLUMN IF NOT EXISTS payload_notifikasi JSONB")
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_transaksi_pembayaran_midtrans_order_id "
        "ON transaksi_pembayaran (midtrans_order_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_transaksi_pembayaran_midtrans_transaction_id "
        "ON transaksi_pembayaran (midtrans_transaction_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_transaksi_pembayaran_status_transaksi "
        "ON transaksi_pembayaran (status_transaksi)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_transaksi_pembayaran_status_transaksi")
    op.execute("DROP INDEX IF EXISTS idx_transaksi_pembayaran_midtrans_transaction_id")
    op.execute("DROP INDEX IF EXISTS uq_transaksi_pembayaran_midtrans_order_id")
    op.execute("ALTER TABLE transaksi_pembayaran DROP COLUMN IF EXISTS payload_notifikasi")
    op.execute("ALTER TABLE transaksi_pembayaran DROP COLUMN IF EXISTS midtrans_transaction_status")
    op.execute("ALTER TABLE transaksi_pembayaran DROP COLUMN IF EXISTS midtrans_status_message")
    op.execute("ALTER TABLE transaksi_pembayaran DROP COLUMN IF EXISTS midtrans_status_code")
    op.execute("ALTER TABLE transaksi_pembayaran DROP COLUMN IF EXISTS midtrans_fraud_status")
    op.execute("ALTER TABLE transaksi_pembayaran DROP COLUMN IF EXISTS midtrans_payment_type")
    op.execute("ALTER TABLE transaksi_pembayaran DROP COLUMN IF EXISTS midtrans_redirect_url")
    op.execute("ALTER TABLE transaksi_pembayaran DROP COLUMN IF EXISTS midtrans_snap_token")
    op.execute("ALTER TABLE transaksi_pembayaran DROP COLUMN IF EXISTS midtrans_transaction_id")
    op.execute("ALTER TABLE transaksi_pembayaran DROP COLUMN IF EXISTS midtrans_order_id")
