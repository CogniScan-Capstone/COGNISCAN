from pydantic import BaseModel


class PatientDashboardSummaryResponse(BaseModel):
    pesan_baru: int
    total_konsultasi: int
