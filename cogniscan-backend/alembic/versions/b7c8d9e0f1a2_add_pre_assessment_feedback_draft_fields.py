"""add pre assessment feedback draft fields

Revision ID: b7c8d9e0f1a2
Revises: a1b2c3d4e5f6
Create Date: 2026-05-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "b7c8d9e0f1a2"
down_revision: str | None = "a1b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("pra_asesmen", sa.Column("catatan_internal_psikolog", sa.Text(), nullable=True))
    op.add_column("pra_asesmen", sa.Column("akurasi_ai_psikolog", sa.Text(), nullable=True))
    op.add_column("pra_asesmen", sa.Column("severity_final_psikolog", sa.Text(), nullable=True))
    op.add_column("pra_asesmen", sa.Column("rekomendasi_tindak_lanjut_psikolog", sa.Text(), nullable=True))
    op.add_column("pra_asesmen", sa.Column("draft_feedback_psikolog", sa.Text(), nullable=True))
    op.add_column("pra_asesmen", sa.Column("draft_catatan_internal", sa.Text(), nullable=True))
    op.add_column("pra_asesmen", sa.Column("draft_akurasi_ai", sa.Text(), nullable=True))
    op.add_column("pra_asesmen", sa.Column("draft_severity_final", sa.Text(), nullable=True))
    op.add_column("pra_asesmen", sa.Column("draft_rekomendasi_tindak_lanjut", sa.Text(), nullable=True))
    op.add_column("pra_asesmen", sa.Column("draft_disimpan_pada", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("pra_asesmen", "draft_disimpan_pada")
    op.drop_column("pra_asesmen", "draft_rekomendasi_tindak_lanjut")
    op.drop_column("pra_asesmen", "draft_severity_final")
    op.drop_column("pra_asesmen", "draft_akurasi_ai")
    op.drop_column("pra_asesmen", "draft_catatan_internal")
    op.drop_column("pra_asesmen", "draft_feedback_psikolog")
    op.drop_column("pra_asesmen", "rekomendasi_tindak_lanjut_psikolog")
    op.drop_column("pra_asesmen", "severity_final_psikolog")
    op.drop_column("pra_asesmen", "akurasi_ai_psikolog")
    op.drop_column("pra_asesmen", "catatan_internal_psikolog")
