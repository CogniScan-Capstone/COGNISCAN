"""baseline existing Supabase schema

Revision ID: a1b2c3d4e5f6
Revises:
Create Date: 2026-05-14

Schema ini sudah dibuat manual di Supabase sebelum Alembic dipakai.
Revision ini sengaja no-op agar database existing bisa di-stamp sebagai baseline
tanpa membuat ulang tabel.
"""

from collections.abc import Sequence

from alembic import op


revision: str = "a1b2c3d4e5f6"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """No-op: schema baseline sudah ada di Supabase."""

    pass


def downgrade() -> None:
    """No-op: jangan drop schema existing lewat baseline."""

    pass
