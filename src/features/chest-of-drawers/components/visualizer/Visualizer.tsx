import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type WheelEvent,
} from "react";
import { useChestStore } from "../../store.ts";
import {
  selectCarcassDimensions,
  selectAllDrawerBoxes,
} from "../../selectors.ts";
import FrontAuditView, { frontAuditContentSize } from "./FrontAuditView.tsx";
import DepthAuditView, { depthAuditContentSize } from "./DepthAuditView.tsx";
import WidthAuditView, { widthAuditContentSize } from "./WidthAuditView.tsx";
import ThreeView from "./ThreeView.tsx";
import JigView from "./JigView.tsx";
import { TOOLBAR_BTN, ZOOM_BTN } from "./svg-constants.ts";
import { useSvgTooltip, SvgTooltipOverlay } from "./SvgTooltip.tsx";

type ViewTab = "front" | "depth" | "width" | "3d" | "jig";

const PADDING = 15;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

export default function Visualizer() {
  const config = useChestStore((s) => s.config);
  const [activeTab, setActiveTab] = useState<ViewTab>("front");
  const [zoom, setZoom] = useState(1);
  const [selectedColumn, setSelectedColumn] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const carcass = useMemo(() => selectCarcassDimensions(config), [config]);
  const drawerBoxes = useMemo(() => selectAllDrawerBoxes(config), [config]);
  const { tooltip, tt } = useSvgTooltip(containerRef);

  const frontSize = useMemo(() => frontAuditContentSize(carcass), [carcass]);
  const depthSize = useMemo(() => depthAuditContentSize(carcass), [carcass]);
  const widthSize = useMemo(() => widthAuditContentSize(carcass), [carcass]);

  let contentWidth: number;
  let contentHeight: number;
  if (activeTab === "front") {
    contentWidth = frontSize.width;
    contentHeight = frontSize.height;
  } else if (activeTab === "depth") {
    contentWidth = depthSize.width;
    contentHeight = depthSize.height;
  } else if (activeTab === "width") {
    contentWidth = widthSize.width;
    contentHeight = widthSize.height;
  } else {
    contentWidth = carcass.outerWidth;
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

  // Scale factor: pixels per SVG unit (approximate, for DimensionChain label threshold)
  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => {
      ro.disconnect();
    };
  }, []);
  const svgScale = containerWidth > 0 ? containerWidth / scaledW : 8;

  // Show column selector for all audit views when multi-column
  const showColumnSelector =
    activeTab !== "3d" && activeTab !== "jig" && config.columns.length > 1;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-stone-200 px-3 py-2">
        <div className="flex gap-1">
          <TabButton
            label="Front Audit"
            active={activeTab === "front"}
            onClick={() => {
              setActiveTab("front");
            }}
          />
          <TabButton
            label="Depth Audit"
            active={activeTab === "depth"}
            onClick={() => {
              setActiveTab("depth");
            }}
          />
          <TabButton
            label="Width Audit"
            active={activeTab === "width"}
            onClick={() => {
              setActiveTab("width");
            }}
          />
          <TabButton
            label="3D"
            active={activeTab === "3d"}
            onClick={() => {
              setActiveTab("3d");
            }}
          />
          <TabButton
            label="Slide Jig"
            active={activeTab === "jig"}
            onClick={() => {
              setActiveTab("jig");
            }}
          />
        </div>
        {activeTab !== "3d" && activeTab !== "jig" && (
          <div className="flex items-center gap-2">
            {showColumnSelector && (
              <select
                value={selectedColumn}
                onChange={(e) => {
                  setSelectedColumn(Number(e.target.value));
                }}
                className="text-xs border rounded px-1 py-1 text-stone-700"
              >
                {config.columns.map((_, i) => (
                  <option key={i} value={i}>
                    Column {i + 1}
                  </option>
                ))}
              </select>
            )}
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

      <div
        ref={containerRef}
        className="relative flex-1 overflow-auto bg-white"
      >
        {activeTab === "3d" ? (
          <ThreeView />
        ) : activeTab === "jig" ? (
          <JigView />
        ) : (
          <svg
            role="img"
            aria-label={`Chest of drawers ${activeTab} audit view`}
            width="100%"
            height="100%"
            viewBox={`${String(offsetX)} ${String(offsetY)} ${String(scaledW)} ${String(scaledH)}`}
            preserveAspectRatio="xMidYMid meet"
            onWheel={handleWheel}
            className="min-h-[300px]"
          >
            <g transform={`translate(${String(PADDING)}, ${String(PADDING)})`}>
              {activeTab === "front" ? (
                <FrontAuditView
                  config={config}
                  carcass={carcass}
                  drawerBoxes={drawerBoxes}
                  selectedColumn={selectedColumn}
                  tt={tt}
                  scale={svgScale}
                />
              ) : activeTab === "depth" ? (
                <DepthAuditView
                  config={config}
                  carcass={carcass}
                  drawerBoxes={drawerBoxes}
                  selectedColumn={selectedColumn}
                  tt={tt}
                  scale={svgScale}
                />
              ) : (
                <WidthAuditView
                  config={config}
                  carcass={carcass}
                  drawerBoxes={drawerBoxes}
                  selectedColumn={selectedColumn}
                  tt={tt}
                  scale={svgScale}
                />
              )}
            </g>
          </svg>
        )}
        {activeTab !== "3d" && activeTab !== "jig" && (
          <SvgTooltipOverlay tooltip={tooltip} />
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
