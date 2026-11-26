"""Drive the SwitchBot panel bundle against harness.html and save screenshots.

Usage: python3 run_panel.py OUT_DIR
(needs Playwright + Chromium; on this box run with the extracted libs and a
fonts.conf, see the headless Chromium notes). Build the bundle first:
``cd frontend-src && npm run build``.
"""

import asyncio
import json
from pathlib import Path
import sys

from playwright.async_api import async_playwright

HERE = Path(__file__).parent
COMPONENT = HERE.parents[1] / "custom_components/ha_switchbot_ble"


def check(cond: bool, what: str, failures: list[str]) -> None:
    print(("ok   " if cond else "FAIL ") + what)
    if not cond:
        failures.append(what)


async def main(out: Path) -> int:
    out.mkdir(parents=True, exist_ok=True)
    errors: list[str] = []
    failures: list[str] = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()

        async def page_for(lang: str = "pl", dark: bool = False, width: int = 900):
            page = await browser.new_page(viewport={"width": width, "height": 1000})
            page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
            page.on("console", lambda m: m.type == "error" and errors.append(m.text))
            page.on("dialog", lambda d: asyncio.ensure_future(d.accept()))

            async def serve(route):
                rel = route.request.url.split("?")[0].removeprefix("http://panel.test/")
                if rel == "harness":
                    await route.fulfill(body=(HERE / "harness.html").read_text(), content_type="text/html")
                else:
                    await route.fulfill(body=(COMPONENT / rel).read_text(), content_type="text/javascript")

            await page.route("http://panel.test/**", serve)
            await page.goto(f"http://panel.test/harness?lang={lang}")
            if dark:
                await page.evaluate("document.documentElement.classList.add('dark')")
            await page.wait_for_function("!!customElements.get('switchbot-panel')")
            await page.evaluate("document.getElementById('p').hass = window.mockHass")
            await page.wait_for_timeout(300)
            return page

        async def shot(page, name):
            await page.screenshot(path=str(out / f"{name}.png"), full_page=True)

        async def ws(page, type_):
            return [m for m in await page.evaluate("window.wsLog") if m["type"] == type_]

        async def open_device(page, entry):
            await page.locator(f'#p a.item[data-entry="{entry}"]').click()
            await page.wait_for_timeout(250)

        async def tab(page, section):
            await page.locator(f'#p a.tab[data-section="{section}"]').click()
            await page.wait_for_timeout(300)

        async def back(page):
            await page.locator("#p .toolbar .icon-btn").click()
            await page.wait_for_timeout(200)


        # ------------------------------------------------- cover calibration wizards
        W = "#p sb-cover-calibration"

        async def cstep(page):
            return await page.eval_on_selector(W, "e => e._step || ''")

        async def wait_step(page, want, timeout=40):
            for _ in range(int(timeout * 5)):
                if await cstep(page) == want:
                    await page.wait_for_timeout(150)
                    return True
                await page.wait_for_timeout(200)
            check(False, f"wizard reaches {want} (at {await cstep(page)!r})", failures)
            return False

        async def wait_enabled(page, sel, timeout=30):
            loc = page.locator(f"{W} {sel}").first
            for _ in range(int(timeout * 5)):
                if await loc.count() and await loc.is_enabled():
                    return True
                await page.wait_for_timeout(200)
            check(False, f"{sel} becomes enabled at {await cstep(page)!r}", failures)
            return False

        async def c(page, sel):
            await page.locator(f"{W} {sel}").first.click()
            await page.wait_for_timeout(150)

        async def demo(page, ev):  # demo bar scenario switch
            await page.locator(f'#p .demo-bar [data-demo="{ev}"]').click()
            await page.wait_for_timeout(150)

        async def has_error(page):
            return await page.locator(f"{W} .alert.error").count() > 0

        async def open_wizard(page, entry, mode, theme):
            await open_device(page, entry)
            await tab(page, "calibration")
            await page.wait_for_timeout(400)
            await shot(page, f"30_{entry}_calibration_{theme}")
            await c(page, f"[data-mode={mode}]")
            await page.wait_for_timeout(400)

        async def finish_home(page, entry, name, theme):
            ok = await wait_step(page, "done")
            await shot(page, f"31_{entry}_{name}_done_{theme}")
            await c(page, "[data-act=home]")
            return ok

        async def cover_wizards(page, theme):
            # Curtain 3, U rail: Smart (firmware 2.2: pull to start), then Smart Correction
            await open_wizard(page, "demo_c3u", "smart", theme)
            await wait_step(page, "logo")
            await shot(page, f"31_demo_c3u_logo_{theme}")
            check(not await page.locator(f"{W} [data-act=next]").is_enabled(), "logo step needs the tick", failures)
            await c(page, ".check input")
            await c(page, "[data-act=next]")
            await wait_step(page, "magnet")
            await c(page, "[data-choice='0']")
            await wait_step(page, "pull")
            await shot(page, f"31_demo_c3u_pull_{theme}")
            await c(page, "[data-demo-step=pull]")
            await wait_step(page, "calibrating")
            await page.wait_for_timeout(1200)
            await shot(page, f"31_demo_c3u_calibrating_{theme}")
            await finish_home(page, "demo_c3u", "smart", theme)
            await page.wait_for_timeout(400)
            modes = await page.locator(f"{W} [data-mode]").evaluate_all("els => els.map(e => e.dataset.mode)")
            check(modes == ["smart", "custom", "correction"], f"Curtain 3 modes after an auto run {modes}", failures)
            await c(page, "[data-mode=correction]")
            await wait_step(page, "corrPull")
            await c(page, "[data-demo-step=pull]")
            await wait_step(page, "fixing")
            await shot(page, f"31_demo_c3u_fixing_{theme}")
            await finish_home(page, "demo_c3u", "correction", theme)
            await back(page)
            if theme != "light":
                return
            # Curtain 3, I rail: Custom with jogs
            await open_wizard(page, "demo_c3i", "custom", theme)
            await wait_step(page, "logo")
            await c(page, ".check input")
            await c(page, "[data-act=next]")
            await wait_step(page, "close")
            await shot(page, "31_demo_c3i_close_light")
            await c(page, ".check input")
            await c(page, "[data-act=next]")
            await wait_step(page, "magnet")
            await c(page, "[data-choice='1']")
            await wait_step(page, "manualOpen")
            await wait_enabled(page, "[data-jog=right]")
            await c(page, "[data-jog=right]")
            await page.wait_for_timeout(700)
            await shot(page, "31_demo_c3i_jogging_light")
            check(not await page.locator(f"{W} [data-act=next]").is_enabled(), "no Next while jogging", failures)
            await c(page, "[data-jog=right]")
            await wait_enabled(page, "[data-act=next]")
            await c(page, "[data-act=next]")
            await wait_step(page, "manualClose")
            await wait_enabled(page, "[data-act=next]")
            await shot(page, "31_demo_c3i_manualClose_light")
            await c(page, "[data-act=next]")
            await finish_home(page, "demo_c3i", "custom", theme)
            await back(page)
            # Curtain 3 rod, firmware 2.1: older Smart, magnet missing then found, open side; timeout
            await open_wizard(page, "demo_c3rod", "smart", theme)
            await wait_step(page, "logo")
            await shot(page, "31_demo_c3rod_profile_light")
            await c(page, ".check input")
            await c(page, "[data-act=next]")
            await wait_step(page, "close")
            await c(page, ".check input")
            await c(page, "[data-act=next]")
            await wait_step(page, "magnet")
            await demo(page, "nomagnet")
            await c(page, "[data-choice='0']")
            await page.wait_for_timeout(1500)
            check(await has_error(page) and await cstep(page) == "magnet", "no magnet: error, step stays", failures)
            await shot(page, "31_demo_c3rod_nomagnet_light")
            await demo(page, "nomagnet")
            await c(page, "[data-choice='0']")
            await wait_step(page, "openSide")
            await shot(page, "31_demo_c3rod_openSide_light")
            await c(page, "[data-choice='1']")
            await finish_home(page, "demo_c3rod", "smart", theme)
            await demo(page, "timeout")
            await c(page, "[data-mode=smart]")
            await wait_step(page, "logo")
            await c(page, ".check input")
            await c(page, "[data-act=next]")
            await wait_step(page, "close")
            await c(page, ".check input")
            await c(page, "[data-act=next]")
            await wait_step(page, "magnet")
            await c(page, "[data-choice='1']")
            await wait_step(page, "openSide")
            await c(page, "[data-choice='0']")
            await page.wait_for_timeout(16000)
            check(await has_error(page), "motor never stops: timeout error", failures)
            await shot(page, "31_demo_c3rod_timeout_light")
            await c(page, "[data-act=home]")
            await demo(page, "timeout")
            await back(page)
            # Track 4 with solar panel: Smart, logo outside
            await open_wizard(page, "demo_t4solar", "smart", theme)
            await wait_step(page, "mount")
            await shot(page, "31_demo_t4solar_mount_light")
            await c(page, "[data-choice='1']")
            await wait_step(page, "calibrating")
            await page.wait_for_timeout(1000)
            await shot(page, "31_demo_t4solar_calibrating_light")
            await finish_home(page, "demo_t4solar", "smart", theme)
            await back(page)
            # Track 4 Extended Battery: route too short -> recalibrate -> finish anyway
            await open_device(page, "demo_t4bat")
            await tab(page, "calibration")
            await demo(page, "short")
            await c(page, "[data-mode=smart]")
            await wait_step(page, "mount")
            await c(page, "[data-choice='0']")
            await wait_step(page, "short")
            await shot(page, "31_demo_t4bat_short_light")
            await c(page, "[data-choice='0']")
            await wait_step(page, "mount")
            await c(page, "[data-choice='0']")
            await wait_step(page, "short")
            await c(page, "[data-choice='1']")
            await finish_home(page, "demo_t4bat", "short", theme)
            await demo(page, "short")
            await back(page)
            # Track 4 pair: Custom, cancelled half-way (exit frames)
            await open_wizard(page, "demo_t4pair", "custom", theme)
            await wait_step(page, "mount")
            await shot(page, "31_demo_t4pair_mount_light")
            await c(page, "[data-choice='0']")
            await wait_step(page, "manualOpen")
            await c(page, "[data-act=cancel]")
            await page.wait_for_timeout(600)
            check(await page.locator(f"{W} [data-mode]").count() > 0, "cancel returns to the mode list", failures)
            await back(page)
            # Roller Shade: full (stuck branch), route correction, open<=closed, obstacle, low battery
            await open_wizard(page, "demo_roller", "full", theme)
            await wait_step(page, "direction")
            await shot(page, "31_demo_roller_direction_light")
            await c(page, "[data-choice='0']")
            await wait_step(page, "rollUp")
            await wait_step(page, "stuckSel")
            await shot(page, "31_demo_roller_stuckSel_light")
            await c(page, "[data-choice='1']")
            await wait_step(page, "stuckHelp")
            await c(page, "[data-act=next]")
            await wait_step(page, "stuckSel")
            await c(page, "[data-choice='0']")
            await wait_step(page, "setOpen")
            await c(page, "[data-jog=down]")
            await page.wait_for_timeout(1200)
            await c(page, "[data-jog=down]")
            await wait_enabled(page, "[data-act=next]")
            await c(page, "[data-act=next]")
            await wait_step(page, "setClosed")
            check(not await page.locator(f"{W} [data-act=next]").is_enabled(), "Finish needs a jog first", failures)
            await c(page, "[data-jog=down]")
            await page.wait_for_timeout(1500)
            await c(page, "[data-jog=down]")
            await wait_enabled(page, "[data-act=next]")
            await shot(page, "31_demo_roller_setClosed_light")
            await c(page, "[data-act=next]")
            await finish_home(page, "demo_roller", "full", theme)
            await page.wait_for_timeout(300)
            await c(page, "[data-mode=route]")
            await wait_step(page, "stuckSel")
            await c(page, "[data-choice='0']")
            await finish_home(page, "demo_roller", "route", theme)
            await demo(page, "short")
            await c(page, "[data-mode=full]")
            await wait_step(page, "direction")
            await c(page, "[data-choice='0']")
            await wait_step(page, "stuckSel")
            await c(page, "[data-choice='0']")
            await wait_step(page, "setOpen")
            await c(page, "[data-act=next]")
            await wait_step(page, "setClosed")
            await c(page, "[data-jog=down]")
            await page.wait_for_timeout(800)
            await c(page, "[data-jog=down]")
            await wait_enabled(page, "[data-act=next]")
            await c(page, "[data-act=next]")
            await page.wait_for_timeout(1500)
            check(await has_error(page), "rolled-up below closed: error", failures)
            await shot(page, "31_demo_roller_open_below_closed_light")
            await c(page, "[data-act=home]")
            await demo(page, "short")
            await demo(page, "block")
            # the shade is low after the last run: rolling up meets the obstacle half-way
            await c(page, "[data-mode=full]")
            await wait_step(page, "direction")
            await c(page, "[data-choice='0']")
            await page.wait_for_timeout(9000)
            check(await has_error(page), "obstacle while rolling up: stuck error", failures)
            await shot(page, "31_demo_roller_stuck_light")
            await c(page, "[data-act=home]")
            await demo(page, "block")
            await demo(page, "lowbatt")
            await page.wait_for_timeout(300)
            check(not await page.locator(f"{W} [data-mode=full]").is_enabled(), "low battery: no calibration", failures)
            await shot(page, "31_demo_roller_lowbatt_light")
            await demo(page, "lowbatt")
            await back(page)
            # Blind Tilt horizontal: four points; vertical: wrong way
            await open_wizard(page, "demo_blindh", "tilt", theme)
            await wait_step(page, "b1")
            await shot(page, "31_demo_blindh_b1_light")
            await c(page, "[data-demo-step=turn]")
            await page.wait_for_timeout(2500)
            await c(page, "[data-act=next]")
            await wait_step(page, "b2")
            check(not await page.locator(f"{W} [data-act=next]").is_enabled(), "point 2 waits for the device", failures)
            for this, nxt in (("b2", "b3"), ("b3", "b4"), ("b4", "done")):
                await c(page, "[data-demo-step=turn]")
                await wait_enabled(page, "[data-act=next]")
                await shot(page, f"31_demo_blindh_{this}_light")
                await c(page, "[data-act=next]")
                await wait_step(page, nxt)
            await finish_home(page, "demo_blindh", "tilt", theme)
            await back(page)
            await open_wizard(page, "demo_blindv", "tilt", theme)
            await wait_step(page, "b1")
            await c(page, "[data-demo-step=turn]")
            await page.wait_for_timeout(2500)
            await c(page, "[data-act=next]")
            await wait_step(page, "b2")
            await c(page, "[data-demo-step=wrong_way]")
            await page.wait_for_timeout(1500)
            check(await has_error(page), "wrong-way turn: error", failures)
            await shot(page, "31_demo_blindv_wrong_way_light")
            await c(page, "[data-act=home]")
            await back(page)


        # ------------------------------------------------- lock calibration wizards
        L = "#p sb-lock-calibration"

        async def lstep(page):
            return await page.eval_on_selector(L, "e => e._mode ? (e._blocked ? 'jam' : (e._step || '')) : 'home'")

        async def lwait(page, want, timeout=40):
            for _ in range(int(timeout * 5)):
                if await lstep(page) == want:
                    await page.wait_for_timeout(250)
                    return True
                await page.wait_for_timeout(200)
            check(False, f"lock wizard reaches {want} (at {await lstep(page)!r})", failures)
            return False

        async def lenabled(page, sel="[data-act=next]", timeout=15):
            loc = page.locator(f"{L} {sel}").first
            for _ in range(int(timeout * 5)):
                if await loc.count() and await loc.is_enabled():
                    return True
                await page.wait_for_timeout(200)
            check(False, f"{sel} becomes enabled at {await lstep(page)!r}", failures)
            return False

        async def ldisabled(page, sel="[data-act=next]"):
            loc = page.locator(f"{L} {sel}").first
            return await loc.count() > 0 and not await loc.is_enabled()

        async def lc(page, sel):
            await page.locator(f"{L} {sel}").first.click()
            await page.wait_for_timeout(200)

        async def hand(page, action):  # demo: what the user does at the door
            await lc(page, f"[data-demo-step={action}]")
            await page.wait_for_timeout(1700)

        async def lshot(page, entry, name, theme):
            # a scrolled page puts the sticky toolbar in the middle of a full-page shot
            await page.evaluate("window.scrollTo(0, 0)")
            await page.wait_for_timeout(100)
            await shot(page, f"40_{entry}_{name}_{theme}")

        async def lock_log(page):  # demo mode: the demo lock simulator logs every action
            return await page.evaluate("window.sbDemoLockActions")

        async def actions_since(page, start):
            return [m["action"] for m in (await lock_log(page))[start:]]

        async def lopen(page, entry, theme, shot_home=True):
            await open_device(page, entry)
            await tab(page, "calibration")
            await page.wait_for_timeout(500)
            if shot_home:
                await lshot(page, entry, "home", theme)
            return await page.locator(f"{L} [data-mode]").evaluate_all("els => els.map(e => e.dataset.mode)")

        async def lmode(page, mode):
            start = len(await lock_log(page))
            await lc(page, f"[data-mode={mode}]")
            await page.wait_for_timeout(500)
            return start

        async def lock_wizards(page, theme):
            # demo_lock: Lock Ultra EU, Night Latch setting unknown, magnet not calibrated
            modes = await lopen(page, "demo_lock", theme)
            check(modes == ["auto", "manual", "half", "door"], f"Lock Ultra EU modes {modes}", failures)
            # auto, Night Latch: latch question, has_latch=True, auto steps, then the magnet
            t0 = await lmode(page, "auto")
            await lwait(page, "latch")
            await lshot(page, "demo_lock", "auto_latch", theme)
            await lc(page, "[data-act=latch-night]")
            await lwait(page, "auto1")
            await lshot(page, "demo_lock", "auto_auto1_nl", theme)
            await hand(page, "release_latch")
            await lc(page, "[data-act=next]")
            await lwait(page, "auto2")
            await lshot(page, "demo_lock", "auto_auto2_nl", theme)
            await lc(page, "[data-choice='0']")
            await lwait(page, "auto3")
            await lshot(page, "demo_lock", "auto_auto3_nl", theme)
            await lc(page, "[data-choice='0']")
            await lwait(page, "done")
            await lshot(page, "demo_lock", "auto_done_magnet", theme)
            await lc(page, "[data-choice='0']")  # Calibrate Magnet
            await lwait(page, "door1")
            await lshot(page, "demo_lock", "auto_door1", theme)
            await hand(page, "door_ajar")
            await lc(page, "[data-act=next]")
            await lwait(page, "door2")
            await lshot(page, "demo_lock", "auto_door2", theme)
            await hand(page, "door_close")
            await lc(page, "[data-act=next]")
            await lwait(page, "door_done", 30)
            await lshot(page, "demo_lock", "auto_door_done", theme)
            await lc(page, "[data-choice='0']")
            await lwait(page, "home")
            acts = await actions_since(page, t0)
            check(acts == ["start", "set_latch", "auto_record_unlocked", "auto_record_locked", "complete",
                           "start", "set_door_open", "set_door_closed", "test_lock", "complete"],
                  f"auto Night Latch + magnet actions {acts}", failures)
            latch = [m for m in (await lock_log(page))[t0:] if m.get("action") == "set_latch"]
            check(latch and latch[0]["has_latch"] is True, f"has_latch(01) for a night latch ({latch})", failures)
            # manual, One-Piece: unlocked position, Test Locking / Unlocking, then close and lock
            t0 = await lmode(page, "manual")
            await lwait(page, "latch")
            await lc(page, "[data-act=latch-onepiece]")
            await lwait(page, "m1")
            await lshot(page, "demo_lock", "manual_m1", theme)
            await hand(page, "turn_locked")
            await lc(page, "[data-act=next]")
            await lwait(page, "m2")
            check(await ldisabled(page), "m2: Next waits for >=10 deg", failures)
            await lshot(page, "demo_lock", "manual_m2_wait", theme)
            await hand(page, "turn_unlocked")
            await lenabled(page)
            await lshot(page, "demo_lock", "manual_m2", theme)
            await lc(page, "[data-act=next]")
            await lwait(page, "g3")
            await lshot(page, "demo_lock", "manual_g3", theme)
            await lc(page, "[data-act=next]")
            await lwait(page, "done")
            await lshot(page, "demo_lock", "manual_done", theme)
            await lc(page, "[data-choice='0']")
            await lwait(page, "close")
            await lshot(page, "demo_lock", "manual_close", theme)
            await lc(page, "[data-act=next]")
            await lwait(page, "home")
            acts = await actions_since(page, t0)
            check(acts == ["start", "set_lock_position", "set_unlock_position", "test_lock", "test_unlock",
                           "complete", "lock"], f"manual One-Piece actions {acts}", failures)
            # half-lock (Lock Ultra: no half_lock_start / half_lock_complete), retried once, then Partially-Lock on
            t0 = await lmode(page, "half")
            await lwait(page, "half1")
            check(await ldisabled(page), "half1: Next waits for >=10 deg", failures)
            await lshot(page, "demo_lock", "half_half1", theme)
            await hand(page, "turn_half")
            await lc(page, "[data-act=next]")
            await lwait(page, "half2")
            await lshot(page, "demo_lock", "half_half2", theme)
            await lc(page, "[data-choice='1']")
            await lwait(page, "half1")
            await hand(page, "turn_half")
            await lc(page, "[data-act=next]")
            await lwait(page, "half2")
            await lc(page, "[data-choice='0']")
            await lwait(page, "half_done")
            await lshot(page, "demo_lock", "half_done", theme)
            await lc(page, "[data-choice='0']")
            acts = await actions_since(page, t0)
            check(acts == ["notify", "half_lock_set_and_test", "half_lock_set_and_test", "half_lock_enable"],
                  f"Lock Ultra half-lock actions {acts}", failures)
            # auto: the motor stalls at each end (blocked state) before the flag -> no jam (app ignores lockState)
            await lmode(page, "auto")
            await lwait(page, "latch")
            await lc(page, "[data-act=latch-onepiece]")
            await hand(page, "turn_unlocked")
            await lc(page, "[data-act=next]")
            await lwait(page, "auto2")
            check(True, "auto: end-of-travel stall is not a jam", failures)
            await lc(page, "[data-act=cancel]")
            await lwait(page, "home")
            # jam while the motor drives: jam dialog, no step retry, "Check the installation"
            await demo(page, "block")
            await lmode(page, "manual")
            await lwait(page, "latch")
            await lc(page, "[data-act=latch-onepiece]")
            await lwait(page, "m1")
            await hand(page, "turn_locked")
            await lc(page, "[data-act=next]")
            await lwait(page, "m2")
            await hand(page, "turn_unlocked")
            await lenabled(page)
            await lc(page, "[data-act=next]")  # set_unlock_position drives the motor -> blocked
            await lwait(page, "jam")
            check(await page.locator(f"{L} [data-act=next]").count() == 0, "jam: no Next (no step retry)", failures)
            await lshot(page, "demo_lock", "jam", theme)
            await lc(page, "[data-act=install]")
            await lwait(page, "home")
            await lshot(page, "demo_lock", "jam_install", theme)
            await demo(page, "block")
            # low battery: no calibration
            await demo(page, "lowbatt")
            await page.wait_for_timeout(300)
            check(await ldisabled(page, "[data-mode=auto]"), "low battery: calibration unavailable", failures)
            await lshot(page, "demo_lock", "lowbatt", theme)
            await demo(page, "lowbatt")
            await back(page)

            # demo_lock_nl: Night Latch known -> no question; Next waits for the latch
            await lopen(page, "demo_lock_nl", theme)
            t0 = await lmode(page, "manual")
            await lwait(page, "m1")
            await hand(page, "turn_locked")
            await lc(page, "[data-act=next]")
            await lwait(page, "m2")
            await hand(page, "turn_unlocked")
            check(await ldisabled(page), "night latch: Next waits for the latch", failures)
            await lshot(page, "demo_lock_nl", "manual_m2_nl_nolatch", theme)
            await hand(page, "release_latch")
            await lenabled(page)
            await lshot(page, "demo_lock_nl", "manual_m2_nl", theme)
            await lc(page, "[data-act=next]")
            await lwait(page, "g3")
            await lshot(page, "demo_lock_nl", "manual_g3_nl", theme)
            await lc(page, "[data-act=next]")
            await lwait(page, "done")
            await lc(page, "[data-choice='0']")
            await lwait(page, "close")
            await lc(page, "[data-act=next]")
            await lwait(page, "home")
            acts = await actions_since(page, t0)
            check(acts[:3] == ["start", "set_lock_position", "set_latch_position"], f"night latch: set_latch_position ({acts})", failures)
            await back(page)

            # demo_lock_op: One-Piece known; auto "No" branch -> guided steps with the Done tick
            await lopen(page, "demo_lock_op", theme)
            t0 = await lmode(page, "auto")
            await lwait(page, "auto1")
            await lshot(page, "demo_lock_op", "auto_auto1", theme)
            await hand(page, "turn_unlocked")
            await lc(page, "[data-act=next]")
            await lwait(page, "auto2")
            await lshot(page, "demo_lock_op", "auto_auto2", theme)
            await lc(page, "[data-choice='1']")
            await lwait(page, "g1")
            check(await ldisabled(page), "g1: Next needs the Done tick", failures)
            await lshot(page, "demo_lock_op", "auto_g1", theme)
            await hand(page, "turn_locked")
            await lc(page, "[data-act=check]")
            await lc(page, "[data-act=next]")
            await lwait(page, "g2")
            await hand(page, "turn_unlocked")
            await lc(page, "[data-act=check]")
            await lshot(page, "demo_lock_op", "auto_g2", theme)
            await lc(page, "[data-act=next]")
            await lwait(page, "g3")
            await lshot(page, "demo_lock_op", "auto_g3", theme)
            await lc(page, "[data-act=next]")
            await lwait(page, "done")
            await lc(page, "[data-choice='0']")
            await lwait(page, "close")
            await lc(page, "[data-act=next]")
            await lwait(page, "home")
            acts = await actions_since(page, t0)
            check(acts == ["start", "set_latch", "auto_record_unlocked", "set_lock_position", "set_unlock_position",
                           "test_lock", "test_unlock", "complete", "lock"], f"auto guided actions {acts}", failures)
            latch = [m for m in (await lock_log(page))[t0:] if m.get("action") == "set_latch"]
            check(latch and latch[0]["has_latch"] is False, f"has_latch(00) for a one-piece lock ({latch})", failures)
            await back(page)

            # demo_lock_us: non-EU, no half-lock, no latch question; no answer -> timeout
            modes = await lopen(page, "demo_lock_us", theme)
            check(modes == ["auto", "manual", "door"], f"non-EU Lock Ultra modes {modes}", failures)
            await demo(page, "timeout")
            t0 = await lmode(page, "auto")
            await lwait(page, "auto1")
            await hand(page, "turn_unlocked")
            await lc(page, "[data-act=next]")
            await page.wait_for_timeout(31500)
            check(await lstep(page) == "auto1" and await page.locator(f"{L} .alert.error").count() == 1,
                  "no flag in 30 s: timeout error, step stays", failures)
            await lshot(page, "demo_lock_us", "timeout", theme)
            await lc(page, "[data-act=cancel]")
            await lwait(page, "home")
            acts = await actions_since(page, t0)
            check(acts == ["start", "auto_record_unlocked", "leave"], f"non-EU auto: no has_latch; cancel leaves ({acts})",
                  failures)
            await demo(page, "timeout")
            await back(page)

            # demo_lockpro: Lock Pro EU, latch question after p1, door ajar, two tests
            await lopen(page, "demo_lockpro", theme)
            t0 = await lmode(page, "pro")
            await lwait(page, "p1")
            await lshot(page, "demo_lockpro", "pro_p1", theme)
            await hand(page, "turn_locked")
            await lc(page, "[data-act=next]")
            await lwait(page, "latch")
            await lshot(page, "demo_lockpro", "pro_latch", theme)
            await lc(page, "[data-act=latch-night]")
            await lwait(page, "p2")
            await hand(page, "release_latch")
            await lenabled(page)
            await lshot(page, "demo_lockpro", "pro_p2_nl", theme)
            await lc(page, "[data-act=next]")
            await lwait(page, "p3")
            await hand(page, "door_ajar")
            check(await ldisabled(page), "p3: Next waits for the lock turned by hand", failures)
            await lshot(page, "demo_lockpro", "pro_p3_wait", theme)
            await hand(page, "lock_manual")
            await lenabled(page)
            await lshot(page, "demo_lockpro", "pro_p3", theme)
            await lc(page, "[data-act=next]")
            await lwait(page, "p4")
            await lshot(page, "demo_lockpro", "pro_p4", theme)
            await lc(page, "[data-act=next]")
            await lwait(page, "p5")
            await hand(page, "door_close")
            await lshot(page, "demo_lockpro", "pro_p5", theme)
            await lc(page, "[data-act=next]")
            await lwait(page, "pro_done")
            await lshot(page, "demo_lockpro", "pro_done", theme)
            await lc(page, "[data-choice='0']")
            acts = await actions_since(page, t0)
            check(acts == ["start", "set_lock_position_door_closed", "set_latch_position", "set_door_open",
                           "test_unlock", "test_lock", "complete"], f"Lock Pro actions {acts}", failures)
            # no magnet: Try Again stays, Skip still records the open door
            await demo(page, "nomagnet")
            t0 = await lmode(page, "pro")
            await lwait(page, "p1")
            await hand(page, "turn_locked")
            await lc(page, "[data-act=next]")
            await lwait(page, "latch")
            await lc(page, "[data-act=latch-onepiece]")
            await hand(page, "turn_unlocked")
            await lc(page, "[data-act=next]")
            await lwait(page, "p3")
            await hand(page, "lock_manual")
            await lc(page, "[data-act=next]")
            await lwait(page, "p3_nomagnet")
            await lshot(page, "demo_lockpro", "pro_nomagnet", theme)
            await lc(page, "[data-choice='0']")
            await lwait(page, "p3")
            await lc(page, "[data-act=next]")
            await lwait(page, "p3_nomagnet")
            await lc(page, "[data-choice='1']")
            await lwait(page, "p4")
            await demo(page, "nomagnet")
            # jam in the unlock test
            await demo(page, "block")
            await lc(page, "[data-act=next]")
            await lwait(page, "jam")
            await lshot(page, "demo_lockpro", "jam", theme)
            await demo(page, "block")
            await lc(page, "[data-act=recalibrate]")
            await lwait(page, "p1")
            await lc(page, "[data-act=cancel]")
            await lwait(page, "home")
            acts = await actions_since(page, t0)
            check(acts == ["start", "set_lock_position_door_closed", "set_unlock_position", "set_door_open",
                           "test_unlock", "leave", "start", "leave"], f"Lock Pro no magnet / jam actions {acts}", failures)
            await back(page)

            # demo_lock1: Lock (gen 1), normal lock type: one wizard, door against the frame, two tests
            modes = await lopen(page, "demo_lock1", theme)
            check(modes == ["lock1"], f"Lock (gen 1) modes {modes}", failures)
            t0 = await lmode(page, "lock1")
            await lwait(page, "l1")
            await lshot(page, "demo_lock1", "l1", theme)
            await lc(page, "[data-act=next]")  # always enabled, like the app
            await lwait(page, "l2")
            check(await ldisabled(page), "Lock l2: Next waits for the knob", failures)
            await lshot(page, "demo_lock1", "l2_wait", theme)
            await hand(page, "turn_unlocked")
            await lenabled(page)
            await lc(page, "[data-act=next]")
            await lwait(page, "l3")
            await hand(page, "door_against")
            check(await ldisabled(page), "Lock l3: Next waits for the lock turned by hand", failures)
            await hand(page, "lock_manual")
            await lenabled(page)
            await lshot(page, "demo_lock1", "l3", theme)
            await lc(page, "[data-act=next]")
            await lwait(page, "l4")
            await lshot(page, "demo_lock1", "l4", theme)
            await lc(page, "[data-act=next]")
            await lwait(page, "l5")
            await hand(page, "door_close")
            await lshot(page, "demo_lock1", "l5", theme)
            await lc(page, "[data-act=next]")
            await lwait(page, "classic_done")
            await lshot(page, "demo_lock1", "done", theme)
            await lc(page, "[data-choice='0']")
            acts = await actions_since(page, t0)
            check(acts == ["start", "set_lock_position_door_closed", "set_unlock_position_door_open", "notify_off",
                           "set_door_open", "notify", "test_unlock", "test_lock", "notify_off", "complete"],
                  f"Lock (gen 1) actions {acts}", failures)
            await back(page)

            # demo_lock1_nl: the lock reports a latch: the app's question; "need a key" -> set_latch_type, no unlock frame
            await lopen(page, "demo_lock1_nl", theme, shot_home=False)
            t0 = await lmode(page, "lock1")
            await lwait(page, "l1")
            await lc(page, "[data-act=next]")
            await lwait(page, "l2")
            await hand(page, "turn_unlocked")
            await lenabled(page)
            await lc(page, "[data-act=next]")
            await lwait(page, "latch1")
            await lshot(page, "demo_lock1_nl", "latch1", theme)
            await lc(page, "[data-choice='0']")
            await lwait(page, "l3")
            await hand(page, "door_against")
            await hand(page, "lock_manual")
            await lenabled(page)
            await lshot(page, "demo_lock1_nl", "l3_nl", theme)
            await lc(page, "[data-act=next]")
            await lwait(page, "l4")
            await lshot(page, "demo_lock1_nl", "l4_nl", theme)
            await lc(page, "[data-act=cancel]")
            await lwait(page, "home")
            acts = await actions_since(page, t0)
            check(acts == ["start", "set_lock_position_door_closed", "set_latch_type", "notify_off", "set_door_open",
                           "notify", "leave"], f"Lock night latch: latch type frame, no unlock frame; cancel leaves {acts}", failures)
            # "Yes, no key": the unlock frame as usual, no set_latch_type
            t0 = await lmode(page, "lock1")
            await lwait(page, "l1")
            await lc(page, "[data-act=next]")
            await lwait(page, "l2")
            await hand(page, "turn_unlocked")
            await lenabled(page)
            await lc(page, "[data-act=next]")
            await lwait(page, "latch1")
            await lc(page, "[data-choice='1']")
            await lwait(page, "l3")
            await lc(page, "[data-act=cancel]")
            await lwait(page, "home")
            acts = await actions_since(page, t0)
            check(acts == ["start", "set_lock_position_door_closed", "set_unlock_position_door_open", "leave"],
                  f"Lock latch 'no key': unlock frame, no latch type frame {acts}", failures)
            await back(page)

            # demo_lite: Lock Lite: test locking from the unlock step, close door, jam -> recalibrate commits (complete)
            modes = await lopen(page, "demo_lite", theme)
            check(modes == ["lite"], f"Lock Lite modes {modes}", failures)
            t0 = await lmode(page, "lite")
            await lwait(page, "t1")
            await lshot(page, "demo_lite", "t1", theme)
            await lc(page, "[data-act=next]")
            await lwait(page, "t2")
            check(await ldisabled(page), "Lite t2: Test Locking waits for the knob", failures)
            await hand(page, "turn_unlocked")
            await lenabled(page)
            await lshot(page, "demo_lite", "t2", theme)
            await lc(page, "[data-act=next]")
            await lwait(page, "t3")
            await lshot(page, "demo_lite", "t3", theme)
            await lc(page, "[data-act=next]")
            await lwait(page, "t4")
            await lshot(page, "demo_lite", "t4", theme)
            await lc(page, "[data-act=next]")
            await lwait(page, "classic_done")
            await lc(page, "[data-choice='0']")
            acts = await actions_since(page, t0)
            check(acts == ["start", "set_lock_position_door_closed", "set_unlock_position_door_open", "test_lock",
                           "test_unlock", "test_lock", "notify_off", "complete"], f"Lock Lite actions {acts}", failures)
            t0 = await lmode(page, "lite")
            await lwait(page, "t1")
            await lc(page, "[data-act=next]")
            await lwait(page, "t2")
            await hand(page, "turn_unlocked")
            await demo(page, "block")
            await lc(page, "[data-act=next]")
            await lwait(page, "jam")
            await lshot(page, "demo_lite", "jam", theme)
            await demo(page, "block")
            await lc(page, "[data-act=recalibrate]")
            await lwait(page, "t1")
            await lc(page, "[data-act=cancel]")
            await lwait(page, "home")
            acts = await actions_since(page, t0)
            check(acts == ["start", "set_lock_position_door_closed", "set_unlock_position_door_open", "test_lock",
                           "notify_off", "complete", "start", "leave"], f"Lock Lite jam: recalibrate commits {acts}",
                  failures)
            await back(page)

            # demo_ultramax: half_lock_start once, half_lock_complete on OK and on Cancel; door without magnet; jam
            await lopen(page, "demo_ultramax", theme)
            t0 = await lmode(page, "half")
            await lwait(page, "half1")
            await lshot(page, "demo_ultramax", "half_half1", theme)
            await hand(page, "turn_half")
            await lc(page, "[data-act=next]")
            await lwait(page, "half2")
            await lc(page, "[data-choice='1']")
            await lwait(page, "half1")
            await hand(page, "turn_half")
            await lc(page, "[data-act=next]")
            await lwait(page, "half2")
            await lshot(page, "demo_ultramax", "half_half2", theme)
            await lc(page, "[data-choice='0']")
            await lwait(page, "half_done")
            await lc(page, "[data-choice='0']")
            acts = await actions_since(page, t0)
            check(acts == ["notify", "half_lock_start", "half_lock_set_and_test", "half_lock_set_and_test",
                           "half_lock_complete", "half_lock_enable"], f"Ultra Max half-lock actions {acts}", failures)
            t0 = await lmode(page, "half")
            await lwait(page, "half1")
            await lc(page, "[data-act=cancel]")
            await lwait(page, "home")
            acts = await actions_since(page, t0)
            check(acts == ["notify", "half_lock_start", "leave"], f"Ultra Max half-lock cancel sends leave (half-lock exit) {acts}",
                  failures)
            await demo(page, "nomagnet")
            await lmode(page, "door")
            await lwait(page, "door1")
            await lshot(page, "demo_ultramax", "door_door1", theme)
            await lc(page, "[data-act=next]")
            await lwait(page, "door2")
            await lc(page, "[data-act=next]")
            await lwait(page, "door_nomagnet")
            await lshot(page, "demo_ultramax", "door_nomagnet", theme)
            await lc(page, "[data-choice='0']")
            await lwait(page, "door1")
            await lc(page, "[data-act=cancel]")
            await lwait(page, "home")
            await demo(page, "nomagnet")
            await demo(page, "block")
            await lmode(page, "manual")
            await lwait(page, "latch")
            await lc(page, "[data-act=latch-onepiece]")
            await lwait(page, "m1")
            await hand(page, "turn_locked")
            await lc(page, "[data-act=next]")
            await lwait(page, "m2")
            await hand(page, "turn_unlocked")
            await lenabled(page)
            await lc(page, "[data-act=next]")  # Test Locking on m2 drives the motor -> blocked
            await lwait(page, "jam")
            await lshot(page, "demo_ultramax", "jam", theme)
            await lc(page, "[data-act=cancel]")
            await lwait(page, "home")
            await demo(page, "block")
            await back(page)

        # ---------------------------------------------------------------- list
        p = await page_for()
        await shot(p, "01_devices")
        groups = await p.locator("#p h2.card-header").all_inner_texts()
        check(groups == ["Zamki", "Klawiatury", "Gniazdka", "Czujniki"], f"device groups {groups}", failures)
        check(await p.locator("#p a.item").count() == 5, "five devices listed", failures)

        # ------------------------------------------- sensor stored in the sensor
        await open_device(p, "e1")
        title = await p.locator("#p .main-title").inner_text()
        check(title == "Thermo 0954", f"title is the device name ({title})", failures)
        await shot(p, "02_sensor_overview")
        await tab(p, "correction")
        await p.wait_for_timeout(300)
        reads = [m for m in await ws(p, "ha_switchbot_ble/sensors/device_calibration") if m["action"] == "read"]
        check(len(reads) == 1, "stored correction read automatically once", failures)
        row = p.locator('#p .corr-row[data-key="temperature"]')
        raw = await row.locator('[data-f="raw"]').inner_text()
        check(raw == "21.1", f"measured = advertised - stored ({raw})", failures)
        await row.locator('[data-f="ref"]').fill("21.5")
        await row.locator('[data-act="ref"]').click()
        await row.locator('[data-act="save"]').click()
        await p.wait_for_timeout(400)
        sets = [m for m in await ws(p, "ha_switchbot_ble/sensors/device_calibration") if m["action"] == "set"]
        check(sets and sets[-1].get("temperature") == 0.4, f"saved correction 0.4 to the sensor ({sets})", failures)
        await shot(p, "03_sensor_devcal_saved")

        # --------------------------------------------------- sensor with HA offset
        await back(p)
        await open_device(p, "e2")
        await tab(p, "correction")
        hrow = p.locator('#p .corr-row[data-key="humidity"]')
        for _ in range(3):
            await hrow.locator('[data-step="1"]').click()
        await p.evaluate("pushRaw('e2', 'humidity', 50)")
        await p.wait_for_timeout(100)
        await shot(p, "04_sensor_offset_draft")
        await hrow.locator('[data-act="save"]').click()
        await p.wait_for_timeout(200)
        offs = await ws(p, "ha_switchbot_ble/sensors/set_offset")
        check(offs and offs[-1]["offset"] == 2.3 and offs[-1]["key"] == "humidity", f"HA offset saved ({offs})", failures)

        # ----------------------------------------------------------------- lock
        await back(p)
        await open_device(p, "l1")
        tabs = await p.locator("#p a.tab").evaluate_all("els => els.map(e => e.dataset.section)")
        check(tabs == ["overview", "calibration", "settings", "history"], f"lock tabs {tabs}", failures)
        await shot(p, "05_lock_overview")
        await tab(p, "settings")
        await shot(p, "06_lock_settings")
        await p.locator("#p sb-switch").first.click()
        await p.locator("#p select").first.select_option("fast")
        await p.wait_for_timeout(100)
        svc = await ws(p, "call_service")
        check(
            [(m["domain"], m["service"]) for m in svc] == [("switch", "turn_off"), ("select", "select_option")],
            f"settings call services ({svc})",
            failures,
        )
        await tab(p, "history")
        await p.wait_for_timeout(200)
        await shot(p, "07_lock_history")
        first = await p.locator("#p sb-history .item .headline").first.inner_text()
        check(first == "Zamknięto", f"newest history record first ({first})", failures)
        await tab(p, "calibration")
        await p.wait_for_timeout(200)
        await shot(p, "08_lock_calibration_home")
        modes = await p.locator("#p [data-mode]").evaluate_all("els => els.map(e => e.dataset.mode)")
        # the harness lock reports a non-EU lock type: no half-lock (EU only, as in the app)
        check(modes == ["auto", "manual", "door"], f"Lock Ultra modes {modes}", failures)
        # manual calibration end to end
        await p.locator('#p [data-mode="manual"]').click()
        await p.wait_for_timeout(300)
        await p.locator('#p [data-act="next"]').click()  # g1: locked position
        await p.wait_for_timeout(300)
        disabled = await p.locator('#p [data-act="next"]').is_disabled()
        check(disabled, "g2 waits for the knob to turn", failures)
        await shot(p, "09_lock_manual_g2")
        await p.evaluate("setLock({ knob_angle: 30, lock_state: 1 })")
        await p.wait_for_timeout(100)
        await p.locator('#p [data-act="next"]').click()  # g2 -> test lock
        await p.wait_for_timeout(600)
        await p.locator('#p [data-act="next"]').click()  # g3 -> test unlock + complete
        await p.wait_for_timeout(600)
        await shot(p, "10_lock_manual_done")
        actions = [m["action"] for m in await ws(p, "ha_switchbot_ble/calibration/action")]
        check(
            actions == ["start", "set_lock_position", "set_unlock_position", "test_lock", "test_unlock", "complete"],
            f"manual calibration actions {actions}",
            failures,
        )

        # --------------------------------------------------------------- keypad
        await back(p)
        await open_device(p, "k1")
        await shot(p, "11_keypad_overview")
        await p.locator('#p [data-action="cancel_passcode_lockout"]').click()
        await p.wait_for_timeout(200)
        check(await p.locator('#p [data-action="cancel_passcode_lockout"]').count() == 0, "lockout lifted", failures)
        await tab(p, "passcodes")
        await p.locator('#p [data-act="new"]').click()
        await p.locator('#p [data-f="name"]').fill("Gość")
        await p.locator('#p [data-f="type"]').select_option("time_limited")
        await shot(p, "12_keypad_passcode_form")
        await p.locator('#p [data-act="passcode-save"]').click()
        await p.wait_for_timeout(200)
        added = [m for m in await ws(p, "ha_switchbot_ble/keypad/op") if m["op"] == "add_passcode"]
        check(added and added[-1]["data"]["type"] == "time_limited" and added[-1]["data"]["end"], f"passcode added ({added})", failures)
        msg = await p.locator("#p .alert.success").inner_text()
        check("Kod nr 7" in msg, f"saved code shown once ({msg})", failures)
        await shot(p, "13_keypad_passcodes")
        await tab(p, "settings")
        before_svc = len(await ws(p, "call_service"))
        await p.locator("#p sb-switch").first.click()
        await p.wait_for_timeout(100)
        svc = (await ws(p, "call_service"))[before_svc:]
        check([(m["domain"], m["service"], m["entity_id"]) for m in svc]
              == [("switch", "turn_on", "switch.keypad_wejscie_dzwiek")], f"keypad setting entity ({svc})", failures)
        await shot(p, "14_keypad_settings")
        await tab(p, "history")
        await p.wait_for_timeout(200)
        rows = await p.locator("#p sb-history .item").count()
        check(rows > 0, f"keypad history from the event entity ({rows})", failures)
        await shot(p, "15_keypad_history")

        # ----------------------------------------------------- unavailable plug
        await back(p)
        await open_device(p, "p1")
        await tab(p, "settings")
        await shot(p, "16_plug_settings_unavailable")

        # ----------------------------------------------------------------- demo
        await back(p)
        await p.locator("#p .demo-toggle").click()
        await p.wait_for_timeout(300)
        await shot(p, "17_demo_devices")
        names = await p.locator("#p a.item .headline").all_inner_texts()
        check(all(n.endswith("(demo)") for n in names) and len(names) == 40, f"demo shows only demo devices ({len(names)})", failures)
        groups = await p.locator("#p h2.card-header").all_inner_texts()
        check(groups == ["Zamki", "Klawiatury", "Zasłony i rolety", "Oświetlenie", "Przełączniki", "Gniazdka",
                         "Urządzenia domowe", "Czujniki"], f"demo groups {groups}", failures)
        # every cover model / variant: overview (moving), settings
        for entry in ("demo_c3u", "demo_c3i", "demo_c3rod", "demo_t4solar", "demo_t4bat", "demo_t4pair",
                      "demo_roller", "demo_blindh", "demo_blindv"):
            await open_device(p, entry)
            await p.locator('#p sb-entity-row button[aria-label="Zamknij"]').first.click()
            await p.wait_for_timeout(700)
            state = await p.locator("#p sb-entity-row .state").first.inner_text()
            check("Zamyka" in state or "closing" in state.lower(), f"{entry} closes ({state})", failures)
            await shot(p, f"17a_{entry}_overview")
            await p.locator('#p sb-entity-row button[aria-label="Zatrzymaj"]').first.click()
            await tab(p, "settings")
            await shot(p, f"17b_{entry}_settings")
            await back(p)
        before = len(await p.evaluate("window.wsLog"))
        await open_device(p, "demo_thermo")
        await tab(p, "correction")
        await p.wait_for_timeout(1200)
        drow = p.locator('#p .corr-row[data-key="temperature"]')
        await drow.locator('[data-step="1"]').click()
        await drow.locator('[data-act="save"]').click()
        await p.wait_for_timeout(1200)
        await shot(p, "17b_demo_thermo_saved")
        flash = await drow.locator(".ok-text").count()
        check(flash == 1, "demo sensor correction saved", failures)
        await back(p)
        await open_device(p, "demo_co2")
        await shot(p, "17c_demo_co2_overview")
        await back(p)
        leaked = [m for m in (await p.evaluate("window.wsLog"))[before:] if str(m.get("type", "")).startswith("ha_switchbot_ble/")]
        check(not leaked, f"nothing of the demo reaches the real HA ({leaked})", failures)
        await open_device(p, "demo_plug")
        await tab(p, "settings")
        await p.locator("#p select").first.select_option("off")
        await p.wait_for_timeout(500)
        val = await p.locator("#p select").first.input_value()
        check(val == "off", f"demo plug select kept its value ({val})", failures)
        await shot(p, "18_demo_plug_settings")
        await back(p)
        # appliances: humidifier DND time, purifier off-timer, Fan 2 Pro
        await open_device(p, "demo_humidifier")
        await shot(p, "18a_demo_humidifier_overview")
        await tab(p, "settings")
        times = p.locator('#p input[type="time"]')
        check(await times.count() == 2, f"humidifier DND start/end time inputs ({await times.count()})", failures)
        await times.first.fill("21:30")
        await times.first.dispatch_event("change")
        await p.wait_for_timeout(500)
        check(await times.first.input_value() == "21:30", "demo DND start kept its value", failures)
        await shot(p, "18b_demo_humidifier_settings")
        await back(p)
        await open_device(p, "demo_purifier")
        await shot(p, "18c_demo_purifier_overview")
        box = p.locator('#p input[type="number"]').first
        await box.fill("90")
        await box.dispatch_event("change")
        await p.wait_for_timeout(500)
        check(await box.input_value() == "90", "demo purifier off-timer set", failures)
        await tab(p, "settings")
        await shot(p, "18d_demo_purifier_settings")
        await back(p)
        await open_device(p, "demo_fanpro")
        await tab(p, "settings")
        await shot(p, "18e_demo_fanpro_settings")
        await back(p)
        # radiator thermostat, water leak detector, presence sensor
        await open_device(p, "demo_trv")
        await p.locator('#p button[aria-label="+"]').first.click()
        await p.wait_for_timeout(500)
        txt = await p.locator("#p sb-entity-row .temp").first.inner_text()
        check("22.5" in txt, f"demo TRV target raised to 22.5 ({txt!r})", failures)
        await shot(p, "18f_demo_trv_overview")
        await tab(p, "settings")
        await shot(p, "18g_demo_trv_settings")
        await back(p)
        await open_device(p, "demo_leak")
        await shot(p, "18h_demo_leak_overview")
        await back(p)
        await open_device(p, "demo_presence")
        await shot(p, "18i_demo_presence_overview")
        await back(p)
        await open_device(p, "demo_plug")
        geo = await p.evaluate("""() => {
            const r = document.getElementById('p').shadowRoot;
            const bar = r.querySelector('.toolbar').getBoundingClientRect();
            const tabs = r.querySelector('.tabs').getBoundingClientRect();
            const demo = r.querySelector('.demo-toggle').getBoundingClientRect();
            return { gap: tabs.top - bar.bottom, overflow: document.documentElement.scrollWidth - innerWidth,
                     demoRight: innerWidth - demo.right };
        }""")
        check(geo["gap"] == 0 and geo["overflow"] <= 0 and geo["demoRight"] >= 8,
              f"tabs sit under the toolbar, nothing overflows ({geo})", failures)
        await back(p)
        await open_device(p, "demo_lockpro")
        await tab(p, "calibration")
        modes = await p.locator("#p [data-mode]").evaluate_all("els => els.map(e => e.dataset.mode)")
        check(modes == ["pro"], f"Lock Pro has only the Pro wizard ({modes})", failures)
        await p.locator('#p [data-mode="pro"]').click()
        await p.wait_for_timeout(600)
        await shot(p, "19_demo_lockpro_p1")
        await p.locator('#p sb-lock-calibration [data-act="cancel"]').click()
        await p.wait_for_timeout(400)
        await back(p)
        await lock_wizards(p, "light")
        await cover_wizards(p, "light")
        await p.locator("#p .demo-toggle").click()
        await p.wait_for_timeout(300)

        # ------------------------------------------------- dark / narrow / english
        p = await page_for(dark=True, width=390)
        await shot(p, "20_dark_narrow_devices")
        await open_device(p, "l1")
        await tab(p, "calibration")
        await p.locator('#p [data-mode="auto"]').click()
        await p.wait_for_timeout(400)
        await shot(p, "21_dark_narrow_auto")
        await p.locator("#p .demo-toggle").click()
        await p.wait_for_timeout(300)
        await lock_wizards(p, "dark")
        await cover_wizards(p, "dark")
        await shot(p, "32_dark_narrow_cover_list")
        await p.locator("#p .demo-toggle").click()
        p = await page_for(lang="en")
        await open_device(p, "e2")
        await tab(p, "correction")
        await shot(p, "22_en_correction")
        await browser.close()

    print("errors:", json.dumps(errors, indent=1))
    return 1 if failures or errors else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main(Path(sys.argv[1]))))
