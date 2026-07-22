/**
 * Reads the text the user is about to type from the host page.
 *
 * Called on an interval from the content script, so it must be cheap and must
 * not throw. Return `null` when there is no typing test on screen — the
 * overlay hides itself in that case.
 *
 * Returning a few characters beyond the immediate next one lets the layout
 * highlight multi-character chords.
 */
export type ReadNextText = () => string | null;

/** Everything `cc-extension-core` needs to know about the host site. */
export interface SiteConfig {
  /**
   * Slug identifying the extension, e.g. `"keybr"`. Used to derive the id of
   * the container element injected into the page.
   */
  id: string;
  /** Human-readable site name, e.g. `"Keybr"`. Shown in the options page. */
  siteName: string;
  /** The site adapter. See {@link ReadNextText}. */
  readNextText: ReadNextText;
}

/** The id of the container element a content script injects for `config`. */
export function getRootElementId(config: SiteConfig): string {
  return `${config.id}-cc-extension-root`;
}
