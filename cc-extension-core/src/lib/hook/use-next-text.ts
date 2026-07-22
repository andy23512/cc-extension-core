import { useEffect, useState } from "react";
import { ReadNextText } from "../model/site-config.model.js";

const POLL_INTERVAL_MS = 100;

/**
 * Polls the host page for the text the user is about to type.
 *
 * The sites we support re-render their typing test without emitting any event
 * we could subscribe to, so polling is the only reliable option.
 */
export function useNextText(readNextText: ReadNextText) {
  const [nextText, setNextText] = useState<string | null>(null);

  useEffect(() => {
    function poll() {
      setNextText(readNextText());
    }
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      clearInterval(interval);
    };
  }, [readNextText]);

  return nextText;
}
