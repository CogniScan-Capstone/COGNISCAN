from api.core.config import Settings
from api.core.logging_config import _redact_value
from api.core.rate_limit import is_local_rate_limit_storage


def test_sql_echo_default_is_disabled():
    assert Settings.model_fields["SQL_ECHO"].default is False


def test_redact_nested_sensitive_payload():
    payload = {
        "safe_status": "ok",
        "teks_jawaban": "Saya merasa cemas akhir-akhir ini",
        "metadata": {
            "temporary_password": "temp-password-123",
            "midtrans_snap_token": "snap-token-123",
            "items": [
                {"catatan_internal_psikolog": "catatan klinis rahasia"},
                {"public_value": "boleh-masuk-log"},
            ],
        },
    }

    redacted = _redact_value(payload)

    assert redacted["safe_status"] == "ok"
    assert redacted["teks_jawaban"] == "[REDACTED]"
    assert redacted["metadata"]["temporary_password"] == "[REDACTED]"
    assert redacted["metadata"]["midtrans_snap_token"] == "[REDACTED]"
    assert redacted["metadata"]["items"][0]["catatan_internal_psikolog"] == "[REDACTED]"
    assert redacted["metadata"]["items"][1]["public_value"] == "boleh-masuk-log"


def test_redact_sensitive_strings():
    raw_log = (
        'Authorization: Bearer abc.def.ghi password="rahasia" '
        'signature_key=midtrans-secret teks_jawaban="Aku sangat sedih"'
    )

    redacted = _redact_value(raw_log)

    assert "abc.def.ghi" not in redacted
    assert "rahasia" not in redacted
    assert "midtrans-secret" not in redacted
    assert "Aku sangat sedih" not in redacted
    assert "[REDACTED]" in redacted


def test_rate_limit_storage_detection_for_multi_instance_warning():
    assert is_local_rate_limit_storage(None) is True
    assert is_local_rate_limit_storage("") is True
    assert is_local_rate_limit_storage("memory://") is True
    assert is_local_rate_limit_storage("redis://localhost:6379/0") is False
    assert is_local_rate_limit_storage("rediss://cache.example.test:6380/0") is False
