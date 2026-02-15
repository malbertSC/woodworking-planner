import { describe, it, expect } from "vitest";
import type {
  ChestConfig,
  Column,
  WoodThickness,
  HorizontalRailConfig,
} from "../../../types.ts";
import { calculateCarcassDimensions } from "../../../calculations/carcass.ts";
import { selectAllDrawerBoxes } from "../../../selectors.ts";
import {
  computeCarcassPanels,
  computeDrawerGroups,
  computeSlidePanels,
  materialColor,
} from "../three-geometry.ts";

const ply34: WoodThickness = {
  id: "ply-3/4",
  nominal: '3/4" plywood',
  actual: 0.71875,
  material: "plywood",
};

const ply14: WoodThickness = {
  id: "ply-1/4",
  nominal: '1/4" plywood',
  actual: 0.25,
  material: "plywood",
};

const ply12: WoodThickness = {
  id: "ply-1/2",
  nominal: '1/2" plywood',
  actual: 0.46875,
  material: "plywood",
};

const hw34: WoodThickness = {
  id: "hw-3/4",
  nominal: '3/4" hardwood (4/4 S2S)',
  actual: 0.75,
  material: "hardwood",
};

const railsDisabled: HorizontalRailConfig = {
  enabled: false,
  thickness: hw34,
  width: 3,
};

const railsEnabled: HorizontalRailConfig = {
  enabled: true,
  thickness: hw34,
  width: 3,
};

function makeColumn(openingWidth: number, rowHeights: number[]): Column {
  return {
    id: `col-${String(openingWidth)}`,
    openingWidth,
    gridWidthUnits: 7,
    rows: rowHeights.map((h, i) => ({
      id: `row-${String(i)}`,
      openingHeight: h,
      binHeightUnits: 4,
      construction: "dado" as const,
    })),
  };
}

function makeConfig(overrides: Partial<ChestConfig> = {}): ChestConfig {
  return {
    name: "Test Chest",
    unit: "inches",
    columns: [makeColumn(14, [6, 6, 6])],
    drawerStyle: "overlay",
    defaultConstruction: "dado",
    defaultRowHeight: 6,
    defaultGridWidthUnits: 7,
    defaultBinHeightUnits: 4,
    woodAssignments: {
      carcassTopBottom: ply34,
      carcassSides: ply34,
      carcassDividers: ply34,
      carcassBack: ply14,
      horizontalRails: hw34,
      drawerSides: ply12,
      drawerFrontBack: ply12,
      drawerBottom: ply14,
      drawerFace: ply34,
    },
    advancedWoodMode: false,
    slideSpec: {
      length: 18,
      clearancePerSide: 0.5,
      minMountingHeight: 1.75,
    },
    horizontalRails: railsDisabled,
    kerfWidth: 0.125,
    dadoGrooveDepth: 0.25,
    dadoGrooveOffset: 0.375,
    overlayOverlap: 0.375,
    insetRevealGap: 0.0625,
    drawerVerticalClearance: 0.75,
    drawerBackClearance: 0.5,
    ...overrides,
  };
}

describe("computeCarcassPanels", () => {
  it("produces minimum 5 panels for single column (top, bottom, 2 sides, back)", () => {
    const config = makeConfig();
    const carcass = calculateCarcassDimensions(config);
    const panels = computeCarcassPanels(config, carcass);

    const types = panels.map((p) => p.type);
    expect(types.filter((t) => t === "top")).toHaveLength(1);
    expect(types.filter((t) => t === "bottom")).toHaveLength(1);
    expect(types.filter((t) => t === "side")).toHaveLength(2);
    expect(types.filter((t) => t === "back")).toHaveLength(1);
    expect(panels.length).toBe(5);
  });

  it("panel dimensions match carcass calculations", () => {
    const config = makeConfig();
    const carcass = calculateCarcassDimensions(config);
    const panels = computeCarcassPanels(config, carcass);
    const topBottomT = ply34.actual;
    const innerH = carcass.outerHeight - 2 * topBottomT;

    const top = panels.find((p) => p.key === "top")!;
    expect(top.size[0]).toBeCloseTo(carcass.outerWidth);
    expect(top.size[1]).toBeCloseTo(topBottomT);
    expect(top.size[2]).toBeCloseTo(carcass.innerDepth);

    const side = panels.find((p) => p.key === "left-side")!;
    expect(side.size[0]).toBeCloseTo(ply34.actual);
    expect(side.size[1]).toBeCloseTo(innerH);
    expect(side.size[2]).toBeCloseTo(carcass.innerDepth);

    const back = panels.find((p) => p.key === "back")!;
    expect(back.size[0]).toBeCloseTo(carcass.outerWidth);
    expect(back.size[1]).toBeCloseTo(carcass.outerHeight);
    expect(back.size[2]).toBeCloseTo(ply14.actual);
  });

  it("multi-column config produces correct divider count", () => {
    const config = makeConfig({
      columns: [
        makeColumn(12, [6, 6]),
        makeColumn(14, [6, 6]),
        makeColumn(12, [6, 6]),
      ],
    });
    const carcass = calculateCarcassDimensions(config);
    const panels = computeCarcassPanels(config, carcass);

    const dividers = panels.filter((p) => p.type === "divider");
    expect(dividers).toHaveLength(2);
  });

  it("horizontal rails appear when enabled", () => {
    const config = makeConfig({
      columns: [makeColumn(14, [6, 6, 6])],
      horizontalRails: railsEnabled,
    });
    const carcass = calculateCarcassDimensions(config);
    const panels = computeCarcassPanels(config, carcass);

    const rails = panels.filter((p) => p.type === "rail");
    expect(rails).toHaveLength(2);
  });

  it("no rails when disabled", () => {
    const config = makeConfig();
    const carcass = calculateCarcassDimensions(config);
    const panels = computeCarcassPanels(config, carcass);

    const rails = panels.filter((p) => p.type === "rail");
    expect(rails).toHaveLength(0);
  });

  it("multi-column rails produce correct count per column", () => {
    const config = makeConfig({
      columns: [makeColumn(12, [6, 6, 6]), makeColumn(14, [6, 6])],
      horizontalRails: railsEnabled,
    });
    const carcass = calculateCarcassDimensions(config);
    const panels = computeCarcassPanels(config, carcass);

    const rails = panels.filter((p) => p.type === "rail");
    expect(rails).toHaveLength(3);
  });

  it("positions center correctly (edges match expected bounds)", () => {
    const config = makeConfig();
    const carcass = calculateCarcassDimensions(config);
    const panels = computeCarcassPanels(config, carcass);

    const top = panels.find((p) => p.key === "top")!;
    const topEdge = top.position[1] + top.size[1] / 2;
    expect(topEdge).toBeCloseTo(carcass.outerHeight / 2);

    const bottom = panels.find((p) => p.key === "bottom")!;
    const bottomEdge = bottom.position[1] - bottom.size[1] / 2;
    expect(bottomEdge).toBeCloseTo(-carcass.outerHeight / 2);

    const left = panels.find((p) => p.key === "left-side")!;
    const leftEdge = left.position[0] - left.size[0] / 2;
    expect(leftEdge).toBeCloseTo(-carcass.outerWidth / 2);

    const right = panels.find((p) => p.key === "right-side")!;
    const rightEdge = right.position[0] + right.size[0] / 2;
    expect(rightEdge).toBeCloseTo(carcass.outerWidth / 2);

    const back = panels.find((p) => p.key === "back")!;
    const backEdge = back.position[2] - back.size[2] / 2;
    expect(backEdge).toBeCloseTo(-carcass.outerDepth / 2);
  });

  it("assigns correct material types from wood assignments", () => {
    const config = makeConfig({
      woodAssignments: {
        ...makeConfig().woodAssignments,
        carcassTopBottom: hw34,
      },
    });
    const carcass = calculateCarcassDimensions(config);
    const panels = computeCarcassPanels(config, carcass);

    const top = panels.find((p) => p.key === "top")!;
    expect(top.material).toBe("hardwood");

    const side = panels.find((p) => p.key === "left-side")!;
    expect(side.material).toBe("plywood");
  });
});

describe("computeDrawerGroups", () => {
  it("returns one group per drawer opening", () => {
    const config = makeConfig({ columns: [makeColumn(14, [6])] });
    const carcass = calculateCarcassDimensions(config);
    const drawerBoxes = selectAllDrawerBoxes(config);
    const groups = computeDrawerGroups(config, carcass, drawerBoxes);

    expect(groups).toHaveLength(1);
  });

  it("each group has drawerId, panels, and slideLength", () => {
    const config = makeConfig({ columns: [makeColumn(14, [6])] });
    const carcass = calculateCarcassDimensions(config);
    const drawerBoxes = selectAllDrawerBoxes(config);
    const groups = computeDrawerGroups(config, carcass, drawerBoxes);
    const group = groups[0]!;

    expect(group.drawerId).toBe("col-14-row-0");
    expect(group.panels).toHaveLength(8);
    expect(group.slideLength).toBe(18);
  });

  it("each group has 8 panels (5 box + 1 face + 2 drawer-member slides)", () => {
    const config = makeConfig({ columns: [makeColumn(14, [6])] });
    const carcass = calculateCarcassDimensions(config);
    const drawerBoxes = selectAllDrawerBoxes(config);
    const groups = computeDrawerGroups(config, carcass, drawerBoxes);
    const { panels } = groups[0]!;

    const boxPanels = panels.filter((p) => p.type === "drawer");
    const facePanels = panels.filter((p) => p.type === "face");
    const slidePanels = panels.filter((p) => p.type === "slide");
    expect(boxPanels).toHaveLength(5);
    expect(facePanels).toHaveLength(1);
    expect(slidePanels).toHaveLength(2);
  });

  it("drawer dimensions match DrawerBoxDimensions", () => {
    const config = makeConfig({ columns: [makeColumn(14, [6])] });
    const carcass = calculateCarcassDimensions(config);
    const drawerBoxes = selectAllDrawerBoxes(config);
    const { panels } = computeDrawerGroups(config, carcass, drawerBoxes)[0]!;
    const box = drawerBoxes[0]!;

    const leftSide = panels.find((p) => p.key.endsWith("-left"))!;
    expect(leftSide.size[1]).toBeCloseTo(box.sideHeight);
    expect(leftSide.size[2]).toBeCloseTo(box.sideLength);

    const front = panels.find((p) => p.key.endsWith("-front"))!;
    expect(front.size[0]).toBeCloseTo(box.frontBackLength);
    expect(front.size[1]).toBeCloseTo(box.frontBackHeight);

    const bottom = panels.find((p) => p.key.endsWith("-bottom"))!;
    expect(bottom.size[0]).toBeCloseTo(box.bottomWidth);
    expect(bottom.size[2]).toBeCloseTo(box.bottomDepth);

    const face = panels.find((p) => p.type === "face")!;
    expect(face.size[0]).toBeCloseTo(box.faceWidth);
    expect(face.size[1]).toBeCloseTo(box.faceHeight);
  });

  it("faces are positioned at front of carcass", () => {
    const config = makeConfig({ columns: [makeColumn(14, [6])] });
    const carcass = calculateCarcassDimensions(config);
    const drawerBoxes = selectAllDrawerBoxes(config);
    const { panels } = computeDrawerGroups(config, carcass, drawerBoxes)[0]!;
    const backT = ply14.actual;
    const frontZ = -carcass.outerDepth / 2 + backT + carcass.innerDepth;

    const face = panels.find((p) => p.type === "face")!;
    const faceBack = face.position[2] - face.size[2] / 2;
    expect(faceBack).toBeCloseTo(frontZ);
  });

  it("multi-column multi-row produces correct group count", () => {
    const config = makeConfig({
      columns: [makeColumn(12, [6, 6]), makeColumn(14, [6, 6, 6])],
    });
    const carcass = calculateCarcassDimensions(config);
    const drawerBoxes = selectAllDrawerBoxes(config);
    const groups = computeDrawerGroups(config, carcass, drawerBoxes);

    expect(groups).toHaveLength(5);
    for (const g of groups) {
      expect(g.panels).toHaveLength(8);
    }
  });

  it("uses drawer box and face colors", () => {
    const config = makeConfig({ columns: [makeColumn(14, [6])] });
    const carcass = calculateCarcassDimensions(config);
    const drawerBoxes = selectAllDrawerBoxes(config);
    const { panels } = computeDrawerGroups(config, carcass, drawerBoxes)[0]!;

    const boxPanels = panels.filter((p) => p.type === "drawer");
    for (const p of boxPanels) {
      expect(p.material).toBe("#E8D5B7");
    }

    const facePanels = panels.filter((p) => p.type === "face");
    for (const p of facePanels) {
      expect(p.material).toBe("#C4956A");
    }
  });

  it("slideLength comes from config.slideSpec.length", () => {
    const config = makeConfig({
      columns: [makeColumn(14, [6])],
      slideSpec: { length: 22, clearancePerSide: 0.5, minMountingHeight: 1.75 },
    });
    const carcass = calculateCarcassDimensions(config);
    const drawerBoxes = selectAllDrawerBoxes(config);
    const groups = computeDrawerGroups(config, carcass, drawerBoxes);

    expect(groups[0]!.slideLength).toBe(22);
  });
});

describe("computeSlidePanels (cabinet member)", () => {
  it("produces 2 slides per opening", () => {
    const config = makeConfig({ columns: [makeColumn(14, [6])] });
    const carcass = calculateCarcassDimensions(config);
    const panels = computeSlidePanels(config, carcass);

    expect(panels).toHaveLength(2);
    expect(panels.every((p) => p.type === "slide")).toBe(true);
  });

  it("slide dimensions match expected values", () => {
    const config = makeConfig({ columns: [makeColumn(14, [6])] });
    const carcass = calculateCarcassDimensions(config);
    const panels = computeSlidePanels(config, carcass);
    const slide = panels[0]!;

    const expectedWidth = config.slideSpec.clearancePerSide / 2;
    const expectedHeight = 45 / 25.4; // 45mm in inches

    expect(slide.size[0]).toBeCloseTo(expectedWidth);
    expect(slide.size[1]).toBeCloseTo(expectedHeight);
    expect(slide.size[2]).toBeCloseTo(config.slideSpec.length);
  });

  it("multi-column multi-row produces correct count", () => {
    const config = makeConfig({
      columns: [makeColumn(12, [6, 6]), makeColumn(14, [6, 6, 6])],
    });
    const carcass = calculateCarcassDimensions(config);
    const panels = computeSlidePanels(config, carcass);

    // 2 slides per opening: (2 + 3) openings × 2 = 10
    expect(panels).toHaveLength(10);
  });

  it("slides are flush against opening walls", () => {
    const config = makeConfig({ columns: [makeColumn(14, [6])] });
    const carcass = calculateCarcassDimensions(config);
    const panels = computeSlidePanels(config, carcass);
    const memberWidth = config.slideSpec.clearancePerSide / 2;

    const left = panels.find((p) => p.key.endsWith("-L"))!;
    const right = panels.find((p) => p.key.endsWith("-R"))!;

    // Left slide's left edge should be at the left wall of the opening
    const sideT = ply34.actual;
    const openingLeftX = -carcass.outerWidth / 2 + sideT;
    expect(left.position[0] - memberWidth / 2).toBeCloseTo(openingLeftX);

    // Right slide's right edge should be at the right wall of the opening
    const openingRightX = -carcass.outerWidth / 2 + sideT + 14;
    expect(right.position[0] + memberWidth / 2).toBeCloseTo(openingRightX);
  });

  it("uses slide fill color", () => {
    const config = makeConfig({ columns: [makeColumn(14, [6])] });
    const carcass = calculateCarcassDimensions(config);
    const panels = computeSlidePanels(config, carcass);

    for (const p of panels) {
      expect(p.material).toBe("#94A3B8");
    }
  });
});

describe("drawer-member slides", () => {
  it("slide dimensions match cabinet-member slides", () => {
    const config = makeConfig({ columns: [makeColumn(14, [6])] });
    const carcass = calculateCarcassDimensions(config);
    const drawerBoxes = selectAllDrawerBoxes(config);
    const { panels } = computeDrawerGroups(config, carcass, drawerBoxes)[0]!;
    const slides = panels.filter((p) => p.type === "slide");

    const expectedWidth = config.slideSpec.clearancePerSide / 2;
    const expectedHeight = 45 / 25.4;

    for (const slide of slides) {
      expect(slide.size[0]).toBeCloseTo(expectedWidth);
      expect(slide.size[1]).toBeCloseTo(expectedHeight);
      expect(slide.size[2]).toBeCloseTo(config.slideSpec.length);
    }
  });

  it("drawer-member slides sit against drawer box sides", () => {
    const config = makeConfig({ columns: [makeColumn(14, [6])] });
    const carcass = calculateCarcassDimensions(config);
    const drawerBoxes = selectAllDrawerBoxes(config);
    const { panels } = computeDrawerGroups(config, carcass, drawerBoxes)[0]!;
    const memberWidth = config.slideSpec.clearancePerSide / 2;

    const leftSlide = panels.find((p) => p.key.endsWith("-slide-L"))!;
    const rightSlide = panels.find((p) => p.key.endsWith("-slide-R"))!;

    // The left drawer box panel
    const leftBox = panels.find((p) => p.key.endsWith("-left"))!;
    const boxLeftEdge = leftBox.position[0] - leftBox.size[0] / 2;

    // Left slide's right edge should be flush with drawer box left edge
    expect(leftSlide.position[0] + memberWidth / 2).toBeCloseTo(boxLeftEdge);

    // Right drawer box panel
    const rightBox = panels.find((p) => p.key.endsWith("-right"))!;
    const boxRightEdge = rightBox.position[0] + rightBox.size[0] / 2;

    // Right slide's left edge should be flush with drawer box right edge
    expect(rightSlide.position[0] - memberWidth / 2).toBeCloseTo(boxRightEdge);
  });
});

describe("materialColor", () => {
  it("returns correct color for known materials", () => {
    expect(materialColor("plywood")).toBe("#D4A574");
    expect(materialColor("hardwood")).toBe("#B8860B");
    expect(materialColor("mdf")).toBe("#C4B08B");
  });

  it("falls back to plywood color for unknown materials", () => {
    expect(materialColor("bamboo")).toBe("#D4A574");
  });

  it("passes through hex color strings", () => {
    expect(materialColor("#E8D5B7")).toBe("#E8D5B7");
    expect(materialColor("#C4956A")).toBe("#C4956A");
  });
});
