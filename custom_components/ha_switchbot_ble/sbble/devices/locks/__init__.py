"""Locks: Lock, Lock Lite, Lock Pro (Wi-Fi), Lock Ultra, Lock Ultra Max, Lock Vision (Pro).

``lock_base`` is shared by every lock, ``lock_extended`` by the locks with
settings (Lock Pro, Lock 2 family), ``lock2`` by Lock Ultra and Ultra Max.
"""

from . import (  # noqa: F401 (registers the models)
    lock,
    lock_lite,
    lock_pro,
    lock_pro_wifi,
    lock_ultra,
    lock_ultra_max,
    lock_vision,
    lock_vision_pro,
)
