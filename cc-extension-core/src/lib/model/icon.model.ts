import { KeyLabelIcon } from "tangent-cc-lib";

/**
 * Every Material Symbols icon the bundled font subset must contain: the
 * key-label icons from tangent-cc-lib, plus the handful the overlay's own
 * controls use (`info`, `replay`, `settings`).
 *
 * This array is the single source of truth — `minify-icon-font` subsets the
 * font from it, and the assertion at the bottom of this file fails the build
 * if tangent-cc-lib ever gains a key-label icon that is missing here.
 */
export const ICONS = [
  "apps",
  "arrow_circle_down",
  "arrow_circle_left",
  "arrow_circle_right",
  "arrow_circle_up",
  "backspace",
  "block",
  "brightness_high",
  "brightness_low",
  "chevron_backward",
  "chevron_forward",
  "clock_loader_10",
  "copy_all",
  "counter_1",
  "counter_2",
  "counter_3",
  "counter_4",
  "download",
  "heap_snapshot_multiple",
  "home",
  "info",
  "insert_text",
  "join_inner",
  "keyboard_arrow_down",
  "keyboard_arrow_left",
  "keyboard_arrow_right",
  "keyboard_arrow_up",
  "keyboard_capslock",
  "keyboard_command_key",
  "keyboard_option_key",
  "keyboard_return",
  "keyboard_tab",
  "layers",
  "layers_clear",
  "left_click",
  "menu",
  "move_down",
  "move_up",
  "no_sound",
  "play_pause",
  "radio_button_checked",
  "replay",
  "restart_alt",
  "right_click",
  "screenshot_monitor",
  "search",
  "settings",
  "shift",
  "skip_next",
  "skip_previous",
  "space_bar",
  "swipe_down",
  "swipe_left",
  "swipe_right",
  "swipe_up",
  "switch_left",
  "switch_right",
  "terminal",
  "touchpad_mouse",
  "upload",
  "volume_down",
  "volume_up",
  "window",
] as const;

export type Icon = (typeof ICONS)[number];

const _assertEveryKeyLabelIconIsCovered: [KeyLabelIcon] extends [Icon]
  ? true
  : false = true;
void _assertEveryKeyLabelIconIsCovered;
