"""Add audit log table.

Revision ID: c9d0e1f2a3b4
Revises: b8c9d0e1f2a3
Create Date: 2026-06-06
"""

from collections.abc import Sequence

from alembic import op


revision: str = "c9d0e1f2a3b4"
down_revision: str | None = "b8c9d0e1f2a3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS audit_log (
            id_audit_log SERIAL PRIMARY KEY,
            id_aktor UUID REFERENCES pengguna(id) ON DELETE SET NULL,
            email_aktor TEXT,
            peran_aktor TEXT,
            aksi TEXT NOT NULL,
            target_tipe TEXT,
            target_id TEXT,
            status TEXT NOT NULL DEFAULT 'success',
            ip_address TEXT,
            user_agent TEXT,
            metadata JSONB,
            dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_audit_log_dibuat_pada
        ON audit_log (dibuat_pada DESC)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_audit_log_actor_time
        ON audit_log (id_aktor, dibuat_pada DESC)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_audit_log_action_time
        ON audit_log (aksi, dibuat_pada DESC)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_audit_log_target
        ON audit_log (target_tipe, target_id)
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_audit_log_target")
    op.execute("DROP INDEX IF EXISTS idx_audit_log_action_time")
    op.execute("DROP INDEX IF EXISTS idx_audit_log_actor_time")
    op.execute("DROP INDEX IF EXISTS idx_audit_log_dibuat_pada")
    op.execute("DROP TABLE IF EXISTS audit_log")
