import type {
  CarcassDimensions,
  ChestConfig,
  DrawerBoxDimensions,
} from "../../types.ts";
import { COLORS } from "./svg-constants.ts";

export interface Panel3D {
  key: string;
  position: [number, number, number];
  size: [number, number, number];
  material: string;
  type: string;
}

export interface DrawerGroup3D {
  drawerId: string;
  panels: Panel3D[];
  slideLength: number;
}

const MATERIAL_COLORS: Record<string, string> = {
  plywood: COLORS.carcassFill,
  hardwood: "#B8860B",
  mdf: "#C4B08B",
};

export function materialColor(material: string): string {
  if (material.startsWith("#")) return material;
  return MATERIAL_COLORS[material] ?? COLORS.carcassFill;
}

function svgToThree(
  svgX: number,
  svgY: number,
  outerWidth: number,
  outerHeight: number,
  outerDepth: number,
): [number, number, number] {
  return [svgX - outerWidth / 2, outerHeight / 2 - svgY, -outerDepth / 2];
}

function computeTopBottomPanels(
  config: ChestConfig,
  carcass: CarcassDimensions,
): Panel3D[] {
  const { outerWidth, outerHeight, outerDepth, innerDepth } = carcass;
  const topBottomT = config.woodAssignments.carcassTopBottom.actual;
  const backT = config.woodAssignments.carcassBack.actual;
  const mat = config.woodAssignments.carcassTopBottom.material;
  const depthCenter = -outerDepth / 2 + backT + innerDepth / 2;

  return [
    {
      key: "top",
      position: [0, outerHeight / 2 - topBottomT / 2, depthCenter],
      size: [outerWidth, topBottomT, innerDepth],
      material: mat,
      type: "top",
    },
    {
      key: "bottom",
      position: [0, -outerHeight / 2 + topBottomT / 2, depthCenter],
      size: [outerWidth, topBottomT, innerDepth],
      material: mat,
      type: "bottom",
    },
  ];
}

function computeSideAndBackPanels(
  config: ChestConfig,
  carcass: CarcassDimensions,
): Panel3D[] {
  const { outerWidth, outerHeight, outerDepth, innerDepth } = carcass;
  const topBottomT = config.woodAssignments.carcassTopBottom.actual;
  const sideT = config.woodAssignments.carcassSides.actual;
  const backT = config.woodAssignments.carcassBack.actual;
  const sideMat = config.woodAssignments.carcassSides.material;
  const backMat = config.woodAssignments.carcassBack.material;
  const innerH = outerHeight - 2 * topBottomT;
  const depthCenter = -outerDepth / 2 + backT + innerDepth / 2;

  return [
    {
      key: "left-side",
      position: [-outerWidth / 2 + sideT / 2, 0, depthCenter],
      size: [sideT, innerH, innerDepth],
      material: sideMat,
      type: "side",
    },
    {
      key: "right-side",
      position: [outerWidth / 2 - sideT / 2, 0, depthCenter],
      size: [sideT, innerH, innerDepth],
      material: sideMat,
      type: "side",
    },
    {
      key: "back",
      position: [0, 0, -outerDepth / 2 + backT / 2],
      size: [outerWidth, outerHeight, backT],
      material: backMat,
      type: "back",
    },
  ];
}

function computeDividerPanels(
  config: ChestConfig,
  carcass: CarcassDimensions,
): Panel3D[] {
  const { columns } = config;
  if (columns.length <= 1) return [];

  const panels: Panel3D[] = [];
  const sideT = config.woodAssignments.carcassSides.actual;
  const topBottomT = config.woodAssignments.carcassTopBottom.actual;
  const dividerT = config.woodAssignments.carcassDividers.actual;
  const dividerMat = config.woodAssignments.carcassDividers.material;
  const backT = config.woodAssignments.carcassBack.actual;
  const innerH = carcass.outerHeight - 2 * topBottomT;
  const depthCenter = -carcass.outerDepth / 2 + backT + carcass.innerDepth / 2;

  let svgX = sideT;
  for (const [i, col] of columns.entries()) {
    if (i >= columns.length - 1) break;
    svgX += col.openingWidth;
    const [cx] = svgToThree(
      svgX + dividerT / 2,
      0,
      carcass.outerWidth,
      carcass.outerHeight,
      carcass.outerDepth,
    );
    panels.push({
      key: `divider-${String(i)}`,
      position: [cx, 0, depthCenter],
      size: [dividerT, innerH, carcass.innerDepth],
      material: dividerMat,
      type: "divider",
    });
    svgX += dividerT;
  }

  return panels;
}

function computeRailPanels(
  config: ChestConfig,
  carcass: CarcassDimensions,
): Panel3D[] {
  if (!config.horizontalRails.enabled) return [];

  const panels: Panel3D[] = [];
  const sideT = config.woodAssignments.carcassSides.actual;
  const topBottomT = config.woodAssignments.carcassTopBottom.actual;
  const dividerT = config.woodAssignments.carcassDividers.actual;
  const railT = config.horizontalRails.thickness.actual;
  const railMat = config.horizontalRails.thickness.material;
  const railWidth = config.horizontalRails.width;
  const backT = config.woodAssignments.carcassBack.actual;
  const frontZ =
    -carcass.outerDepth / 2 + backT + carcass.innerDepth - railWidth / 2;

  let svgX = sideT;
  for (const [ci, col] of config.columns.entries()) {
    let svgY = topBottomT;
    for (const [r, row] of col.rows.entries()) {
      if (r >= col.rows.length - 1) break;
      svgY += row.openingHeight;
      const [cx, cy] = svgToThree(
        svgX + col.openingWidth / 2,
        svgY + railT / 2,
        carcass.outerWidth,
        carcass.outerHeight,
        carcass.outerDepth,
      );
      panels.push({
        key: `rail-${String(ci)}-${String(r)}`,
        position: [cx, cy, frontZ],
        size: [col.openingWidth, railT, railWidth],
        material: railMat,
        type: "rail",
      });
      svgY += railT;
    }
    svgX += col.openingWidth + dividerT;
  }

  return panels;
}

/** Ball-bearing slide profile height (45 mm) in inches. */
const SLIDE_PROFILE_HEIGHT = 45 / 25.4;

function computeSlidesCabinetMember(
  config: ChestConfig,
  carcass: CarcassDimensions,
): Panel3D[] {
  const panels: Panel3D[] = [];
  const sideT = config.woodAssignments.carcassSides.actual;
  const topBottomT = config.woodAssignments.carcassTopBottom.actual;
  const dividerT = config.woodAssignments.carcassDividers.actual;
  const backT = config.woodAssignments.carcassBack.actual;
  const railT = config.horizontalRails.enabled
    ? config.horizontalRails.thickness.actual
    : 0;
  const boxCenterZ = -carcass.outerDepth / 2 + backT + carcass.innerDepth / 2;
  const memberWidth = config.slideSpec.clearancePerSide / 2;
  const slideLength = config.slideSpec.length;

  let svgX = sideT;
  for (const col of config.columns) {
    let svgY = topBottomT;
    for (const row of col.rows) {
      const slideHeight = Math.min(SLIDE_PROFILE_HEIGHT, row.openingHeight);
      const [cx, cy] = svgToThree(
        svgX + col.openingWidth / 2,
        svgY + row.openingHeight / 2,
        carcass.outerWidth,
        carcass.outerHeight,
        carcass.outerDepth,
      );

      const leftX = cx - col.openingWidth / 2 + memberWidth / 2;
      const rightX = cx + col.openingWidth / 2 - memberWidth / 2;

      panels.push(
        {
          key: `slide-cab-${col.id}-${row.id}-L`,
          position: [leftX, cy, boxCenterZ],
          size: [memberWidth, slideHeight, slideLength],
          material: COLORS.slideFill,
          type: "slide",
        },
        {
          key: `slide-cab-${col.id}-${row.id}-R`,
          position: [rightX, cy, boxCenterZ],
          size: [memberWidth, slideHeight, slideLength],
          material: COLORS.slideFill,
          type: "slide",
        },
      );

      svgY += row.openingHeight + railT;
    }
    svgX += col.openingWidth + dividerT;
  }

  return panels;
}

const DRAWER_BOX_COLOR = COLORS.boxFill;
const DRAWER_FACE_COLOR = COLORS.faceFill;

interface DrawerWoodThicknesses {
  side: number;
  frontBack: number;
  bottom: number;
  face: number;
}

function computeDrawerBoxPanels(
  prefix: string,
  box: DrawerBoxDimensions,
  cx: number,
  cy: number,
  boxCenterZ: number,
  wood: DrawerWoodThicknesses,
): Panel3D[] {
  const hw = box.boxOuterWidth / 2;
  const hd = box.boxOuterDepth / 2;

  return [
    {
      key: `${prefix}-left`,
      position: [cx - hw + wood.side / 2, cy, boxCenterZ],
      size: [wood.side, box.sideHeight, box.sideLength],
      material: DRAWER_BOX_COLOR,
      type: "drawer",
    },
    {
      key: `${prefix}-right`,
      position: [cx + hw - wood.side / 2, cy, boxCenterZ],
      size: [wood.side, box.sideHeight, box.sideLength],
      material: DRAWER_BOX_COLOR,
      type: "drawer",
    },
    {
      key: `${prefix}-front`,
      position: [cx, cy, boxCenterZ + hd - wood.frontBack / 2],
      size: [box.frontBackLength, box.frontBackHeight, wood.frontBack],
      material: DRAWER_BOX_COLOR,
      type: "drawer",
    },
    {
      key: `${prefix}-back`,
      position: [cx, cy, boxCenterZ - hd + wood.frontBack / 2],
      size: [box.frontBackLength, box.frontBackHeight, wood.frontBack],
      material: DRAWER_BOX_COLOR,
      type: "drawer",
    },
    {
      key: `${prefix}-bottom`,
      position: [cx, cy - box.sideHeight / 2 + wood.bottom / 2, boxCenterZ],
      size: [box.bottomWidth, wood.bottom, box.bottomDepth],
      material: DRAWER_BOX_COLOR,
      type: "drawer",
    },
  ];
}

function buildDrawerPanels(
  box: DrawerBoxDimensions,
  colId: string,
  rowId: string,
  cx: number,
  cy: number,
  boxCenterZ: number,
  frontZ: number,
  wood: DrawerWoodThicknesses,
): Panel3D[] {
  const prefix = `drawer-${colId}-${rowId}`;
  return [
    ...computeDrawerBoxPanels(prefix, box, cx, cy, boxCenterZ, wood),
    {
      key: `${prefix}-face`,
      position: [cx, cy, frontZ + wood.face / 2],
      size: [box.faceWidth, box.faceHeight, wood.face],
      material: DRAWER_FACE_COLOR,
      type: "face",
    },
  ];
}

function computeSlidesDrawerMember(
  prefix: string,
  box: DrawerBoxDimensions,
  cx: number,
  cy: number,
  boxCenterZ: number,
  clearancePerSide: number,
  slideLength: number,
  openingHeight: number,
): Panel3D[] {
  const memberWidth = clearancePerSide / 2;
  const slideHeight = Math.min(SLIDE_PROFILE_HEIGHT, openingHeight);
  const hw = box.boxOuterWidth / 2;

  return [
    {
      key: `${prefix}-slide-L`,
      position: [cx - hw - memberWidth / 2, cy, boxCenterZ],
      size: [memberWidth, slideHeight, slideLength],
      material: COLORS.slideFill,
      type: "slide",
    },
    {
      key: `${prefix}-slide-R`,
      position: [cx + hw + memberWidth / 2, cy, boxCenterZ],
      size: [memberWidth, slideHeight, slideLength],
      material: COLORS.slideFill,
      type: "slide",
    },
  ];
}

function getDrawerWoodThicknesses(config: ChestConfig): DrawerWoodThicknesses {
  return {
    side: config.woodAssignments.drawerSides.actual,
    frontBack: config.woodAssignments.drawerFrontBack.actual,
    bottom: config.woodAssignments.drawerBottom.actual,
    face: config.woodAssignments.drawerFace.actual,
  };
}

export function computeDrawerGroups(
  config: ChestConfig,
  carcass: CarcassDimensions,
  drawerBoxes: DrawerBoxDimensions[],
): DrawerGroup3D[] {
  const groups: DrawerGroup3D[] = [];
  const { carcassSides, carcassTopBottom, carcassDividers, carcassBack } =
    config.woodAssignments;
  const railT = config.horizontalRails.enabled
    ? config.horizontalRails.thickness.actual
    : 0;
  const backT = carcassBack.actual;
  const frontZ = -carcass.outerDepth / 2 + backT + carcass.innerDepth;
  const boxCenterZ = -carcass.outerDepth / 2 + backT + carcass.innerDepth / 2;
  const wood = getDrawerWoodThicknesses(config);

  let svgX = carcassSides.actual;
  for (const col of config.columns) {
    let svgY = carcassTopBottom.actual;
    for (const row of col.rows) {
      const box = drawerBoxes.find(
        (b) => b.columnId === col.id && b.rowId === row.id,
      );
      if (!box) {
        svgY += row.openingHeight + railT;
        continue;
      }

      const [cx, cy] = svgToThree(
        svgX + col.openingWidth / 2,
        svgY + row.openingHeight / 2,
        carcass.outerWidth,
        carcass.outerHeight,
        carcass.outerDepth,
      );
      const prefix = `drawer-${col.id}-${row.id}`;
      groups.push({
        drawerId: `${col.id}-${row.id}`,
        panels: [
          ...buildDrawerPanels(
            box,
            col.id,
            row.id,
            cx,
            cy,
            boxCenterZ,
            frontZ,
            wood,
          ),
          ...computeSlidesDrawerMember(
            prefix,
            box,
            cx,
            cy,
            boxCenterZ,
            config.slideSpec.clearancePerSide,
            config.slideSpec.length,
            row.openingHeight,
          ),
        ],
        slideLength: config.slideSpec.length,
      });

      svgY += row.openingHeight + railT;
    }
    svgX += col.openingWidth + carcassDividers.actual;
  }

  return groups;
}

export function computeSlidePanels(
  config: ChestConfig,
  carcass: CarcassDimensions,
): Panel3D[] {
  return computeSlidesCabinetMember(config, carcass);
}

export function computeCarcassPanels(
  config: ChestConfig,
  carcass: CarcassDimensions,
): Panel3D[] {
  return [
    ...computeTopBottomPanels(config, carcass),
    ...computeSideAndBackPanels(config, carcass),
    ...computeDividerPanels(config, carcass),
    ...computeRailPanels(config, carcass),
  ];
}
