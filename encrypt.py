#!/usr/bin/env python3
"""Worklog — шифрование данных.

Читает worklog.json, спрашивает PIN, шифрует AES-256-GCM
(PBKDF2-SHA256, 100000 итераций), пишет data.encrypted.json.

Формат data.encrypted.json:
    { "salt": base64, "iv": base64, "data": base64 }

Формат совместим с crypto.js (Web Crypto API в браузере).
"""
import base64
import getpass
import json
import os
import sys
from pathlib import Path

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    from cryptography.hazmat.primitives import hashes
except ImportError:
    print("❌ Нужна библиотека cryptography.")
    print("   pip install cryptography")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "worklog.json"
DST = ROOT / "data.encrypted.json"
ITERATIONS = 100000


def derive_key(pin: str, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=ITERATIONS,
    )
    return kdf.derive(pin.encode("utf-8"))


def main():
    if not SRC.exists():
        print(f"❌ Не найден {SRC}")
        print("   Создай worklog.json с данными.")
        sys.exit(1)

    data = json.loads(SRC.read_text(encoding="utf-8"))

    pin = os.environ.get("WORKLOG_PIN")
    if not pin:
        pin = getpass.getpass("PIN: ")
        pin2 = getpass.getpass("PIN ещё раз: ")
        if pin != pin2:
            print("❌ PIN не совпадает")
            sys.exit(1)

    salt = os.urandom(16)
    iv = os.urandom(12)
    key = derive_key(pin, salt)

    plaintext = json.dumps(data, ensure_ascii=False).encode("utf-8")
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(iv, plaintext, None)

    out = {
        "salt": base64.b64encode(salt).decode("ascii"),
        "iv": base64.b64encode(iv).decode("ascii"),
        "data": base64.b64encode(ciphertext).decode("ascii"),
    }
    DST.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"✅ {DST.name} обновлён ({DST.stat().st_size} байт)")


if __name__ == "__main__":
    main()
