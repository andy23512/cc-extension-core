import React from "react";
import {
  HighlightKeyCombination,
  KeyLabelMap,
  KeyLabelType,
  Layer,
} from "tangent-cc-lib";
import SwitchComponent from "./switch.component.js";

interface LogoComponentProps {
  showText: boolean;
  siteLabel: string;
  className?: string;
}

const HIGHLIGHT_KEY_COMBINATION: HighlightKeyCombination = {
  characterKeyPositionCode: 0,
  layer: Layer.Primary,
  shiftKey: false,
  altGraphKey: false,
  positionCodes: [2, 3, 4],
  score: 0,
};

const LogoComponent: React.FC<LogoComponentProps> = ({
  showText,
  siteLabel,
  className,
}) => {
  const keyLabelMap: KeyLabelMap = showText
    ? {
        0: [
          {
            type: KeyLabelType.String,
            c: "CC",
            title: "CC",
            layer: null,
            shiftKey: null,
            altGraphKey: null,
          },
        ],
        2: [
          {
            type: KeyLabelType.String,
            c: siteLabel,
            title: siteLabel,
            layer: null,
            shiftKey: null,
            altGraphKey: null,
          },
        ],
        4: [
          {
            type: KeyLabelType.String,
            c: "ext.",
            title: "ext.",
            layer: null,
            shiftKey: null,
            altGraphKey: null,
          },
        ],
      }
    : {};

  return (
    <svg className={className} viewBox="0 0 350 350">
      <SwitchComponent
        center={{ x: 175, y: 175 }}
        rotationDirection="cw"
        rotation={0}
        keyLabelMap={keyLabelMap}
        positionCodeMap={{ c: 0, e: 1, n: 2, w: 3, s: 4 }}
        highlightKeyCombination={HIGHLIGHT_KEY_COMBINATION}
        highlightOpacity={1}
      />
    </svg>
  );
};

export default LogoComponent;
