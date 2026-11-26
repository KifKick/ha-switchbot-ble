"""Encryption of the command channel (locks, keypads, radiator thermostat …).

After connecting, the app asks for the session parameters with the plain frame
``57 000000 0f2103 <key id>``. The reply is ``01 ?? <mode> ?? <iv…>``:

* mode 0, AES-128-CTR: 16 byte IV; every command and reply is encrypted from
  the start of the counter, the frame header carries ``iv[0:2]``.
* mode 1, AES-128-GCM: 12 byte IV followed by 4 more bytes; the frame header
  carries the first two bytes of the tag and the IV counts up by one after each
  command. Replies only carry a 2 byte tag, so they are decrypted unverified.

An encrypted command frame is ``57 <key id> <header 2> <ciphertext>``, the reply
``<status> <3 bytes> <ciphertext>``.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import IntEnum

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

from .errors import OperationError

SESSION_REQUEST = bytes.fromhex("570000000f2103")


class AesMode(IntEnum):
    CTR = 0
    GCM = 1


def check_key(key_id: str, key: str) -> tuple[int, bytes]:
    """Validate the cloud key pair (``"3a"``, 32 hex digits) -> (key id, key)."""
    if len(key_id) != 2:
        raise ValueError("key_id is missing" if not key_id else "key_id is invalid")
    if len(key) != 32:
        raise ValueError("encryption_key is missing" if not key else "encryption_key is invalid")
    try:
        return int(key_id, 16), bytes.fromhex(key)
    except ValueError as err:
        raise ValueError("key_id or encryption_key is not hexadecimal") from err


@dataclass
class Session:
    """Session parameters of one connection."""

    key: bytes
    mode: AesMode
    iv: bytes

    @classmethod
    def from_reply(cls, key: bytes, reply: bytes) -> Session:
        if len(reply) < 3 or reply[0] != 0x01:
            raise OperationError(f"session request rejected ({reply.hex()})")
        try:
            mode = AesMode(reply[2])
        except ValueError as err:
            raise OperationError(f"unknown encryption mode {reply[2]}") from err
        iv = reply[4:-4] if mode is AesMode.GCM else reply[4:]
        if len(iv) != (12 if mode is AesMode.GCM else 16):
            raise OperationError(f"invalid IV length {len(iv)} for {mode.name}")
        return cls(key, mode, bytes(iv))

    def _cipher(self, tag: bytes | None = None) -> Cipher:
        if self.mode is AesMode.GCM:
            return Cipher(algorithms.AES128(self.key), modes.GCM(self.iv, tag))
        return Cipher(algorithms.AES128(self.key), modes.CTR(self.iv))

    def encrypt(self, plain: bytes) -> tuple[bytes, bytes]:
        """-> (2 byte header, ciphertext); empty payloads stay empty."""
        if not plain:
            return b"", b""
        encryptor = self._cipher().encryptor()
        ciphertext = encryptor.update(plain) + encryptor.finalize()
        if self.mode is AesMode.GCM:
            return encryptor.tag[:2], ciphertext
        return self.iv[:2], ciphertext

    def decrypt(self, ciphertext: bytes) -> bytes:
        if not ciphertext:
            return b""
        if self.mode is AesMode.GCM:
            # the 2 byte tag cannot be verified: decrypt without finalize()
            return self._cipher(b"\x00" * 16).decryptor().update(ciphertext)
        decryptor = self._cipher().decryptor()
        return decryptor.update(ciphertext) + decryptor.finalize()

    def advance(self) -> None:
        """GCM: the IV counts up after every command."""
        if self.mode is AesMode.GCM:
            self.iv = (int.from_bytes(self.iv, "big") + 1).to_bytes(12, "big")
