from __future__ import annotations

import asyncio
from contextlib import suppress

from loguru import logger

from api.core.config import settings
from api.core.database import async_session_factory
from api.services.booking_reminder_service import dispatch_due_booking_reminders
from api.services.whatsapp_service import is_waha_configured


class BookingReminderScheduler:
    """Background scheduler sederhana untuk reminder WhatsApp konsultasi."""

    def __init__(self) -> None:
        self._task: asyncio.Task[None] | None = None

    async def start(self) -> None:
        if not settings.BOOKING_REMINDER_SCHEDULER_ENABLED:
            logger.info("Scheduler reminder WhatsApp dinonaktifkan dari konfigurasi.")
            return

        if not is_waha_configured():
            logger.info("Scheduler reminder WhatsApp tidak dijalankan karena WAHA belum aktif.")
            return

        if self._task is not None and not self._task.done():
            return

        self._task = asyncio.create_task(self._run(), name="booking-reminder-scheduler")
        logger.info(
            "Scheduler reminder WhatsApp aktif setiap {} detik.",
            settings.BOOKING_REMINDER_INTERVAL_SECONDS,
        )

    async def stop(self) -> None:
        if self._task is None:
            return

        self._task.cancel()
        with suppress(asyncio.CancelledError):
            await self._task
        self._task = None
        logger.info("Scheduler reminder WhatsApp dihentikan.")

    async def _run(self) -> None:
        if settings.BOOKING_REMINDER_RUN_ON_STARTUP:
            await self._dispatch_once()

        interval_seconds = max(settings.BOOKING_REMINDER_INTERVAL_SECONDS, 60)
        while True:
            await asyncio.sleep(interval_seconds)
            await self._dispatch_once()

    async def _dispatch_once(self) -> None:
        try:
            async with async_session_factory() as db:
                result = await dispatch_due_booking_reminders(db=db)
        except Exception:
            logger.exception("Scheduler reminder WhatsApp gagal memproses reminder.")
            return

        if result.checked or result.sent or result.failed:
            logger.info(
                "Scheduler reminder WhatsApp selesai: checked={}, sent={}, skipped={}, failed={}.",
                result.checked,
                result.sent,
                result.skipped,
                result.failed,
            )


booking_reminder_scheduler = BookingReminderScheduler()
