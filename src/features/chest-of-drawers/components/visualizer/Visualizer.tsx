import { useCallback, useMemo, useRef, useState, type WheelEvent } from "react";
import { useChestStore } from "../../store.ts";
import {
  selectCarcassDimensions,
  selectAllDrawerBoxes,
} from "../../selectors.ts";
import FrontView from "./FrontView.tsx";
import SideView from "./SideView.tsx";
import ThreeView from "./ThreeView.tsx";
import SlideLayoutView, { computeSlideLayoutSize } from "./SlideLayoutView.tsx";
import { TOOLBAR_BTN, ZOOM_BTN } from "./svg-constants.ts";

type ViewTab = "front" | "side" | "3d" | "slides";

const PADDING = 15;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

export default function Visualizer() {
  const config = useChestStore((s) => s.config);
  const [activeTab, setActiveTab] = useState<ViewTab>("front");
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const carcass = useMemo(() => selectCarcassDimensions(config), [config]);
  const drawerBoxes = useMemo(() => selectAllDrawerBoxes(config), [config]);
  const slideLayout = useMemo(
    () => computeSlideLayoutSize(config, carcass, drawerBoxes),
    [config, carcass, drawerBoxes],
  );

  let contentWidth: number;
  let contentHeight: number;
  if (activeTab === "slides") {
    contentWidth = slideLayout.width;
    contentHeight = slideLayout.height;
  } else {
    contentWidth =
      activeTab === "front" ? carcass.outerWidth : carcass.outerDepth;
    contentHeight = carcass.outerHeight;
  }

  const viewBoxWidth = contentWidth + PADDING * 2;
  const viewBoxHeight = contentHeight + PADDING * 2;

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - ZOOM_STEP, MIN_ZOOM));
  }, []);

  const fitToView = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const fit = Math.min(
      el.clientWidth / viewBoxWidth,
      el.clientHeight / viewBoxHeight,
    );
    setZoom(Math.min(Math.max(fit, MIN_ZOOM), MAX_ZOOM));
  }, [viewBoxWidth, viewBoxHeight]);

  const handleWheel = useCallback((e: WheelEvent<SVGSVGElement>) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setZoom((z) => {
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      return Math.min(Math.max(z + delta, MIN_ZOOM), MAX_ZOOM);
    });
  }, []);

  const scaledW = viewBoxWidth / zoom;
  const scaledH = viewBoxHeight / zoom;
  const offsetX = (viewBoxWidth - scaledW) / 2;
  const offsetY = (viewBoxHeight - scaledH) / 2;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-stone-200 px-3 py-2">
        <div className="flex gap-1">
          <TabButton
            label="Front View"
            active={activeTab === "front"}
            onClick={() => {
              setActiveTab("front");
            }}
          />
          <TabButton
            label="Side View"
            active={activeTab === "side"}
            onClick={() => {
              setActiveTab("side");
            }}
          />
          <TabButton
            label="Slide Layout"
            active={activeTab === "slides"}
            onClick={() => {
              setActiveTab("slides");
            }}
          />
          <TabButton
            label="3D"
            active={activeTab === "3d"}
            onClick={() => {
              setActiveTab("3d");
            }}
          />
        </div>
        {activeTab !== "3d" && (
          <div className="flex items-center gap-2">
            <button
              onClick={zoomOut}
              className={ZOOM_BTN}
              aria-label="Zoom out"
            >
              -
            </button>
            <button
              onClick={() => {
                setZoom(1);
              }}
              className="text-xs text-stone-600 min-w-[3rem] text-center cursor-pointer"
              aria-label="Reset zoom to 100%"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button onClick={zoomIn} className={ZOOM_BTN} aria-label="Zoom in">
              +
            </button>
            <button
              onClick={fitToView}
              className={TOOLBAR_BTN}
              aria-label="Fit to view"
            >
              Fit
            </button>
            <button
              onClick={() => {
                setZoom(1);
              }}
              className={TOOLBAR_BTN}
              aria-label="Reset zoom"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto bg-white">
        {activeTab === "3d" ? (
          <ThreeView />
        ) : (
          <svg
            role="img"
            aria-label={`Chest of drawers ${activeTab} view`}
            width="100%"
            height="100%"
            viewBox={`${String(offsetX)} ${String(offsetY)} ${String(scaledW)} ${String(scaledH)}`}
            preserveAspectRatio="xMidYMid meet"
            onWheel={handleWheel}
            className="min-h-[300px]"
          >
            <title>{`Chest of drawers — ${activeTab} view`}</title>
            <g transform={`translate(${String(PADDING)}, ${String(PADDING)})`}>
              {activeTab === "front" ? (
                <FrontView
                  config={config}
                  carcass={carcass}
                  drawerBoxes={drawerBoxes}
                />
              ) : activeTab === "side" ? (
                <SideView config={config} carcass={carcass} />
              ) : (
                <SlideLayoutView
                  config={config}
                  carcass={carcass}
                  drawerBoxes={drawerBoxes}
                />
              )}
            </g>
          </svg>
        )}
      </div>
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`px-3 py-1 text-sm rounded ${
        active
          ? "bg-amber-600 text-white"
          : "bg-stone-100 text-stone-700 hover:bg-stone-200"
      }`}
    >
      {label}
    </button>
  );
}
