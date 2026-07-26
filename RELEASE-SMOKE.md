# Release smoke checklist

Manual pre-release pass for the CC extensions
([keybr-cc-extension](https://github.com/andy23512/keybr-cc-extension),
[monkeytype-cc-extension](https://github.com/andy23512/monkeytype-cc-extension)).

Covers the interactive behaviour the automated suites deliberately leave out —
edit-mode dragging, file import/export, live typing, theming — because
automating it has poor ROI. Everything else has unit or e2e coverage.

**How to read it:** items marked 🟢 already have automated coverage — just
confirm they haven't visibly broken. Items marked 🔴 have none — test these
properly. If a 🟢 item is broken, its unit/e2e test should be red too; look
there first.

Before starting: `yarn build`, then load the unpacked `dist/` (Chrome:
`chrome://extensions` → Developer mode → Load unpacked; Firefox:
`about:debugging` → Load Temporary Add-on → any file in `dist/`).

---

## A. Options page

- [ ] 🟢 Clicking the toolbar icon opens the options page, titled
      "<Site> CC Extension - Options".
- [ ] 🔴 **Import** a device-manager backup JSON — the layout appears in the
      dropdown named after the file and is selected.
- [ ] 🔴 Import the **same file again** — it replaces the entry, no duplicate.
- [ ] 🔴 **Export** downloads a `.json` of the currently selected layout.
- [ ] 🟢 Layout-type toggle → **Lite**: the dropdown switches to CCLite, and
      "Show Thumb 3 Switch" is disabled.
- [ ] 🔴 Step through every device layout (cc1 / m4g / left-hand / right-hand) —
      each selects.
- [ ] 🔴 Change the OS keyboard layout via the autocomplete (e.g. UK, German) —
      searchable and selectable.
- [ ] 🔴 **Reopen the options page** — every choice persisted.

## B. Overlay: display & theme

- [ ] 🟢 On the site, the overlay appears and draws the device layout.
- [ ] 🟢 The key for the next character to type is highlighted.
- [ ] 🔴 **Switch the site's own theme** (try a few: light, dark, coloured) —
      the overlay's colours follow the site. *(This is the refactored CSS
      variable mapping — test it.)*
- [ ] 🔴 After changing the OS keyboard layout, the key labels reflect it
      (e.g. German QWERTZ, symbol positions).
- [ ] 🟢 Lite layout type shows the CCLite keyboard, not the 3D layout.

## C. Overlay: edit mode 🔴

*No automated coverage — needs a human. Enter edit mode via the gear button on
the right of the overlay.*

- [ ] 🔴 Entering edit mode shows a draggable frame with control points.
- [ ] 🔴 **Drag** the overlay — it follows the cursor and stays put on release.
- [ ] 🔴 **Resize** from a corner control point — scales, keeping aspect ratio.
- [ ] 🔴 **Scroll up/down** over the overlay — opacity steps by 0.1, clamped to
      the 0.2–1.0 range.
- [ ] 🔴 The **info** button shows the instructions popover.
- [ ] 🔴 The **reset** button (↺) restores default position, size and opacity.
- [ ] 🔴 After adjusting, **reload the page** — position, size and opacity
      persist.
- [ ] 🔴 In edit mode, scrolling adjusts opacity and does **not** scroll the
      page underneath.

## D. Overlay: live typing 🔴

- [ ] 🔴 Start typing — the highlight follows the next character in real time.
- [ ] 🔴 **Type a space** (especially on keybr) — the space key highlights.
      *(This is the U+E000 fix.)*
- [ ] 🔴 A character needing multiple keys (capital, symbol) — the highlight
      reflects the combination.
- [ ] 🟢 Toggling "Highlight Keys" in the options page updates the already-open
      overlay without a reload.

## E. Cross-browser 🔴

- [ ] 🔴 Run the key items from B–D in **Firefox** too.
- [ ] 🔴 Confirm on **both sites** — keybr and monkeytype scrape the page
      differently.

---

## Efficiency notes

- **Minimum set when short on time:** all of C (edit mode), the space key in D,
  and the theme switch in B. Those are the zero-coverage areas that also touch
  recently changed code. For 🟢 items, "it appears and doesn't crash" is enough.
- **Full release:** A→E, one pass each in Chrome and Firefox.

This checklist is shared by both extensions; the only differences are the site
URL and the keybr-specific space-key behaviour.
