import { Popover } from "@mui/material";
import classNames from "classnames";
import { MouseEvent, useEffect, useRef, useState, WheelEvent } from "react";
import Moveable from "react-moveable";
import { useNextText } from "../hook/use-next-text.js";
import { ReadNextText } from "../model/site-config.model.js";
import { useSettingsStore } from "../store/settings-store.js";
import { getViewBoxAspectRatio } from "../util/layout-dimension.util.js";
import { LITE_ASPECT_RATIO } from "../util/lite.util.js";
import {
  nextOpacityForWheel,
  normalizedAxisPosition,
  pixelAxisPosition,
} from "../util/overlay-position.util.js";
import LayoutContainerComponent from "./layout-container.component.js";

interface AppComponentProps {
  /** The fixed-position host element the overlay is positioned within. */
  containerElement: HTMLDivElement;
  /** Site adapter that reads the text the user is about to type. */
  readNextText: ReadNextText;
}

function AppComponent({ containerElement, readNextText }: AppComponentProps) {
  const mainDivRef = useRef(null);
  const infoButtonRef = useRef(null);

  const [editMode, setEditMode] = useState(false);
  const [infoPopoverOpen, setInfoPopoverOpen] = useState<boolean>(false);
  const [containerWidth, setContainerWidth] = useState<number>(
    containerElement.clientWidth,
  );
  const [containerHeight, setContainerHeight] = useState<number>(
    containerElement.clientHeight,
  );
  const layoutType = useSettingsStore.use.layoutType();
  const isLiteLayoutType = layoutType === "lite";
  const height = useSettingsStore.use.currentHeight();
  const xPosition = useSettingsStore.use.currentXPosition();
  const yPosition = useSettingsStore.use.currentYPosition();
  const opacity = useSettingsStore.use.currentOpacity();
  const showThumb3Switch = useSettingsStore.use.showThumb3Switch();
  const width = isLiteLayoutType
    ? height * LITE_ASPECT_RATIO
    : height * getViewBoxAspectRatio(showThumb3Switch);
  const left = pixelAxisPosition(xPosition, width, containerWidth);
  const top = pixelAxisPosition(yPosition, height, containerHeight);
  const setSettings = useSettingsStore.use.set();
  const resetLayoutDisplay = useSettingsStore.use.resetLayoutDisplay();

  useEffect(() => {
    function handleResize(entries: ResizeObserverEntry[]) {
      const entry = entries[0];
      setEditMode(false);
      setContainerWidth(entry.contentRect.width);
      setContainerHeight(entry.contentRect.height);
    }

    const observer = new ResizeObserver(handleResize);
    observer.observe(containerElement);
    return () => {
      observer.unobserve(containerElement);
      observer.disconnect();
    };
  }, [containerElement]);

  useEffect(() => {
    const preventBodyScroll = (event: Event) => {
      event.preventDefault();
    };

    if (editMode) {
      document.body.addEventListener("wheel", preventBodyScroll, {
        passive: false,
      });
      window.addEventListener("wheel", preventBodyScroll, {
        passive: false,
      });
    } else {
      document.body.removeEventListener("wheel", preventBodyScroll);
      window.removeEventListener("wheel", preventBodyScroll);
    }

    return () => {
      document.body.removeEventListener("wheel", preventBodyScroll);
      window.removeEventListener("wheel", preventBodyScroll);
    };
  }, [editMode]);

  const handleSettingButtonClick = () => {
    setEditMode((prevEditMode) => !prevEditMode);
  };

  const handleInfoButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
    setInfoPopoverOpen((prev) => !prev);
  };

  const handleInfoPopoverClose = () => {
    setInfoPopoverOpen(false);
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!editMode) {
      return;
    }
    if (event.deltaY === 0) {
      return;
    }
    setSettings("opacity", nextOpacityForWheel(opacity, event.deltaY));
  };

  const handleResetButtonClick = () => {
    resetLayoutDisplay();
    setEditMode(false);
  };

  const nextText = useNextText(readNextText);

  return (
    <>
      <div
        ref={mainDivRef}
        className={classNames("absolute min-h-32", {
          invisible: !nextText,
          "pointer-events-auto": editMode,
          "pointer-events-none": !editMode,
        })}
        style={{ opacity, left: left + "px", top: top + "px", width, height }}
        onWheel={handleWheel}
      >
        <LayoutContainerComponent nextText={nextText} />
        {editMode && (
          <button
            className="absolute pointer-events-auto cursor-pointer left-0 top-1/2 -translate-y-5 material-icons !text-3xl"
            onClick={handleResetButtonClick}
          >
            replay
          </button>
        )}
        <div className="absolute right-0 top-1/2 -translate-y-5 flex flex-col gap-1">
          <button
            className={classNames(
              "pointer-events-auto cursor-pointer !text-3xl material-icons",
              {
                "bg-(--cc-pointer-color)": editMode,
                "text-white": editMode,
                "opacity-100": editMode,
                "opacity-50": !editMode,
              },
            )}
            onClick={handleSettingButtonClick}
          >
            settings
          </button>
          {editMode && (
            <>
              <button
                ref={infoButtonRef}
                className="pointer-events-auto cursor-pointer !text-3xl material-icons"
                onClick={handleInfoButtonClick}
              >
                info
              </button>
            </>
          )}
          <Popover
            open={infoPopoverOpen}
            anchorEl={infoButtonRef.current}
            onClose={handleInfoPopoverClose}
            anchorOrigin={{ vertical: "center", horizontal: "right" }}
            transformOrigin={{ vertical: "center", horizontal: "left" }}
            disableScrollLock
          >
            <div className="overflow-hidden p-1">
              Drag to move. Drag the control points to resize. <br />
              Scroll up or down to adjust the transparency. <br />
              Click the reset button on the left to reset to default. <br />
            </div>
          </Popover>
        </div>
      </div>
      <Moveable
        className={classNames("pointer-events-auto", {
          "!invisible": !nextText,
        })}
        padding={{
          left: 8,
          right: 8,
          top: 8,
          bottom: 8,
        }}
        target={editMode ? mainDivRef : null}
        draggable={true}
        onDrag={(e) => {
          e.target.style.left = e.left + "px";
          e.target.style.top = e.top + "px";
        }}
        onDragEnd={(e) => {
          const box = e.target.getBoundingClientRect();
          setSettings(
            "xPosition",
            normalizedAxisPosition(box.left, box.width, containerWidth),
          );
          setSettings(
            "yPosition",
            normalizedAxisPosition(box.top, box.height, containerHeight),
          );
          setSettings("height", box.height);
        }}
        useResizeObserver={true}
        resizable={true}
        keepRatio={true}
        onResize={(e) => {
          e.target.style.width = `${e.width}px`;
          e.target.style.height = `${e.height}px`;
          e.target.style.left = e.drag.left + "px";
          e.target.style.top = e.drag.top + "px";
        }}
        onResizeEnd={(e) => {
          const box = e.target.getBoundingClientRect();
          setSettings(
            "xPosition",
            normalizedAxisPosition(box.left, box.width, containerWidth),
          );
          setSettings(
            "yPosition",
            normalizedAxisPosition(box.top, box.height, containerHeight),
          );
          setSettings("height", box.height);
        }}
        snappable={true}
        bounds={{ left: 8, top: 8, right: 8, bottom: 8, position: "css" }}
        verticalGuidelines={[document.body.clientWidth / 2]}
        horizontalGuidelines={[document.body.clientHeight / 2]}
        snapDirections={{
          center: true,
          middle: true,
        }}
      ></Moveable>
    </>
  );
}

export default AppComponent;
