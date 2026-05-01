"""Initial schema — analyses table.

Revision ID: 001
Revises:
Create Date: 2026-04-03
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "analyses",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, index=True),

        # Upload
        sa.Column("original_filename", sa.String(255), nullable=False),
        sa.Column("image_path", sa.String(512), nullable=False),
        sa.Column("image_width", sa.Integer, nullable=False),
        sa.Column("image_height", sa.Integer, nullable=False),

        # Detection
        sa.Column("det_bbox_x1", sa.Float, nullable=True),
        sa.Column("det_bbox_y1", sa.Float, nullable=True),
        sa.Column("det_bbox_x2", sa.Float, nullable=True),
        sa.Column("det_bbox_y2", sa.Float, nullable=True),
        sa.Column("det_confidence", sa.Float, nullable=True),

        # Classification
        sa.Column("health_class", sa.String(32), nullable=True, index=True),
        sa.Column("health_confidence", sa.Float, nullable=True),
        sa.Column("class_probabilities", sa.Text, nullable=True),

        # Segmentation
        sa.Column("segmentation_mask_path", sa.String(512), nullable=True),
        sa.Column("segmentation_available", sa.Boolean, nullable=False, server_default=sa.text("false")),

        # Damage
        sa.Column("damage_total_pct", sa.Float, nullable=True),
        sa.Column("damage_stress_pct", sa.Float, nullable=True),
        sa.Column("damage_mold_pct", sa.Float, nullable=True),
        sa.Column("damage_dry_pct", sa.Float, nullable=True),

        # Visualization
        sa.Column("visualization_path", sa.String(512), nullable=True),

        # Meta
        sa.Column("processing_time_ms", sa.Integer, nullable=True),
        sa.Column("pipeline_version", sa.String(32), default="0.1.0"),
        sa.Column("error_message", sa.Text, nullable=True),
    )
    op.create_index("ix_analyses_created_at_desc", "analyses", [sa.desc(sa.column("created_at"))])


def downgrade() -> None:
    op.drop_table("analyses")
