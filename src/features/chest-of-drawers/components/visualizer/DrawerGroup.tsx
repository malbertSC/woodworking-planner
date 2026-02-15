import { useRef, useCallback } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import * as THREE from "three";
import { materialColor, type Panel3D } from "./three-geometry.ts";
import { COLORS } from "./svg-constants.ts";

interface DrawerGroupProps {
  drawerId: string;
  panels: Panel3D[];
  slideLength: number;
  isOpen: boolean;
  onToggle: (drawerId: string) => void;
}

export default function DrawerGroup({
  drawerId,
  panels,
  slideLength,
  isOpen,
  onToggle,
}: DrawerGroupProps) {
  const groupRef = useRef<THREE.Group>(null);
  const target = isOpen ? slideLength * 0.75 : 0;

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.z = THREE.MathUtils.lerp(
      groupRef.current.position.z,
      target,
      0.1,
    );
  });

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onToggle(drawerId);
    },
    [drawerId, onToggle],
  );

  const handlePointerOver = useCallback(() => {
    document.body.style.cursor = "pointer";
  }, []);

  const handlePointerOut = useCallback(() => {
    document.body.style.cursor = "auto";
  }, []);

  return (
    <group
      ref={groupRef}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {panels.map((panel) => (
        <mesh key={panel.key} position={panel.position}>
          <boxGeometry args={panel.size} />
          <meshStandardMaterial color={materialColor(panel.material)} />
          <Edges threshold={15} color={COLORS.carcassStroke} />
        </mesh>
      ))}
    </group>
  );
}
