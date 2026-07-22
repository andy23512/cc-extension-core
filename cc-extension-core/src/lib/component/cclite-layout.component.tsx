import { HighlightKeyCombination, KeyLabelMap } from "tangent-cc-lib";
import { generateCCLiteKeyboard } from "../util/lite.util.js";
import CCLiteLayoutKeyComponent from "./cclite-layout-key.component.js";

interface CCLiteLayoutComponentProps {
  keyLabelMap: KeyLabelMap;
  highlightKeyCombination: HighlightKeyCombination | null;
  highlightOpacity: number;
}

const KEYBOARD = generateCCLiteKeyboard();

const CCLiteLayoutComponent: React.FC<CCLiteLayoutComponentProps> = ({
  keyLabelMap,
  highlightKeyCombination,
  highlightOpacity,
}) => {
  const keyboard = KEYBOARD;
  return (
    <svg
      className="cclite-layout h-full"
      shapeRendering="crispEdges"
      textRendering="geometricPrecision"
      viewBox={[0, 0, keyboard.width, keyboard.height].join(" ")}
      style={{ aspectRatio: `${keyboard.width} / ${keyboard.height}` }}
    >
      {keyboard.keys.map((key) => (
        <CCLiteLayoutKeyComponent
          key={key.positionCode}
          x={key.x}
          y={key.y}
          width={key.width}
          height={key.height}
          positionCode={key.positionCode}
          keyLabel={keyLabelMap[key.positionCode]}
          highlightKeyCombination={highlightKeyCombination}
          highlightOpacity={highlightOpacity}
        />
      ))}
    </svg>
  );
};

export default CCLiteLayoutComponent;
