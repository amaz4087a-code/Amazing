"use client";

import { useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { JointData } from "@/types/motion";
import { SKELETON_BONES } from "@/config/joints";

interface SkeletonViewerProps {
  joints: JointData[];
  color?: string;
  highlightJoints?: Set<string>;
  deviationData?: Map<string, number>;
  opacity?: number;
}

// ─── Pre-allocated temporaries for useFrame ─────────────────────────────

const _vec3a = new THREE.Vector3();
const _vec3b = new THREE.Vector3();
const _vec3c = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

function SkeletonMesh({
  joints,
  color = "#00ff88",
  highlightJoints,
  deviationData,
  opacity = 1,
}: SkeletonViewerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const dataRef = useRef({ joints, color, highlightJoints, deviationData, opacity });
  dataRef.current = { joints, color, highlightJoints, deviationData, opacity };

  // Create meshes once
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const jointColor = new THREE.Color(color);
    const boneMat = new THREE.MeshBasicMaterial({
      color: jointColor,
      transparent: opacity < 1,
      opacity,
    });
    const jointMat = new THREE.MeshBasicMaterial({
      color: jointColor,
      transparent: opacity < 1,
      opacity,
    });

    const boneGeo = new THREE.CylinderGeometry(0.02, 0.02, 1, 6);

    // Create bones
    for (const [parentId, childId] of SKELETON_BONES) {
      const mesh = new THREE.Mesh(boneGeo, boneMat);
      mesh.name = `bone-${parentId}-${childId}`;
      mesh.visible = false;
      group.add(mesh);
    }

    // Create joints
    const jointGeo = new THREE.SphereGeometry(0.04, 12, 12);
    const allIds = [
      "hip_center", "spine", "chest", "neck", "head",
      "left_shoulder", "left_elbow", "left_wrist", "left_hand",
      "right_shoulder", "right_elbow", "right_wrist", "right_hand",
      "left_hip", "left_knee", "left_ankle", "left_foot",
      "right_hip", "right_knee", "right_ankle", "right_foot",
    ];
    for (const id of allIds) {
      const mesh = new THREE.Mesh(jointGeo, jointMat);
      mesh.name = `joint-${id}`;
      mesh.visible = false;
      group.add(mesh);
    }

    return () => {
      while (group.children.length > 0) {
        const child = group.children[0];
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
        }
        group.remove(child);
      }
      boneMat.dispose();
      jointMat.dispose();
      boneGeo.dispose();
      jointGeo.dispose();
    };
  }, []); // only once

  // Update positions every frame — reuse pre-allocated Vector3
  useFrame(() => {
    const group = groupRef.current;
    const d = dataRef.current;
    if (!group) return;

    // Build position map (reuse _vec3a for temp)
    const posMap = new Map<string, THREE.Vector3>();
    for (const j of d.joints) {
      posMap.set(j.id, _vec3a.set(j.pos.x, j.pos.y, j.pos.z).clone());
    }

    // Update bones
    for (const [parentId, childId] of SKELETON_BONES) {
      const start = posMap.get(parentId);
      const end = posMap.get(childId);
      const mesh = group.getObjectByName(`bone-${parentId}-${childId}`) as THREE.Mesh | undefined;
      if (!mesh || !start || !end) {
        if (mesh) mesh.visible = false;
        continue;
      }

      const len = _vec3b.copy(end).sub(start).length();
      if (len < 0.001) {
        mesh.visible = false;
        continue;
      }

      mesh.visible = true;
      // mid point
      _vec3c.copy(start).add(end).multiplyScalar(0.5);
      mesh.position.copy(_vec3c);
      // direction
      _vec3b.copy(end).sub(start).normalize();
      mesh.quaternion.setFromUnitVectors(_up, _vec3b);
      mesh.scale.y = len;
    }

    // Update joints
    for (const [id, pos] of posMap) {
      const mesh = group.getObjectByName(`joint-${id}`) as THREE.Mesh | undefined;
      if (!mesh) continue;
      mesh.visible = true;
      mesh.position.copy(pos);

      const deviation = d.deviationData?.get(id) ?? 0;
      const isHighlighted = d.highlightJoints?.has(id);
      const c = isHighlighted ? "#ff3333" : deviation > 0.3 ? "#ff6633" : d.color;
      (mesh.material as THREE.MeshBasicMaterial).color.set(c);
    }
  });

  return <group ref={groupRef} />;
}

export interface SkeletonViewer3DProps {
  joints: JointData[];
  color?: string;
  highlightJoints?: Set<string>;
  deviationData?: Map<string, number>;
  showControls?: boolean;
  opacity?: number;
  height?: string;
}

function CameraInit() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(1.5, 1, 2);
    camera.lookAt(0, 0.5, 0);
  }, [camera]);
  return null;
}

function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />
      <directionalLight position={[-5, -5, -5]} intensity={0.3} />
    </>
  );
}

export function SkeletonViewer3D({
  joints,
  color = "#00ff88",
  highlightJoints,
  deviationData,
  showControls = true,
  opacity = 1,
  height = "400px",
}: SkeletonViewer3DProps) {
  return (
    <div style={{ width: "100%", height, position: "relative" }}>
      <Canvas
        camera={{ position: [1.5, 1, 2], fov: 50 }}
        gl={{ antialias: true }}
      >
        <SceneLights />
        <CameraInit />
        <SkeletonMesh
          joints={joints}
          color={color}
          highlightJoints={highlightJoints}
          deviationData={deviationData}
          opacity={opacity}
        />
        {showControls && <OrbitControls enableDamping dampingFactor={0.1} />}
      </Canvas>
    </div>
  );
}
