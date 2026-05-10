"use client";

import { useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { JointData } from "@/types/motion";

interface CartoonViewer3DProps {
  joints: JointData[];
  showControls?: boolean;
  height?: string;
}

// ─── Pre-allocated temporaries ──────────────────────────────────────

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

// ─── Colors ─────────────────────────────────────────────────────────

const COLORS = {
  body: "#FFD54F",    // warm yellow
  belly: "#FFF3E0",   // light beige
  horn: "#FFA726",    // orange
  eye: "#212121",     // black
  tongue: "#EF5350",  // red
  paw: "#8D6E63",     // brown
  tail: "#66BB6A",    // green tip
  wing: "#FFF9C4",    // light yellow
};

// ─── Segment definitions ────────────────────────────────────────────

interface SegmentDef {
  name: string;
  type: "sphere" | "cylinder" | "cone" | "box" | "torus" | "body-sphere";
  parentId?: string;    // for cylinder: start joint
  childId?: string;     // for cylinder: end joint
  jointId?: string;     // for sphere/cone/box at a single joint
  radius?: number;
  radiusTop?: number;
  radiusBottom?: number;
  height?: number;
  color: string;
  scale?: [number, number, number]; // non-uniform scale
  offset?: [number, number, number]; // position offset from joint
}

const SEGMENTS: SegmentDef[] = [
  // ── Body (pear shape: large bottom + smaller top sphere) ──
  { name: "body_lower", type: "body-sphere", jointId: "hip_center", radius: 0.14, color: COLORS.body, scale: [1.1, 0.9, 1] },
  { name: "body_upper", type: "body-sphere", jointId: "chest", radius: 0.09, color: COLORS.body, scale: [1, 0.9, 0.9] },

  // ── Belly ──
  { name: "belly", type: "sphere", jointId: "spine", radius: 0.065, color: COLORS.belly, scale: [1.4, 1, 0.6], offset: [0, -0.02, 0.08] },

  // ── Head ──
  { name: "head", type: "sphere", jointId: "head", radius: 0.08, color: COLORS.body, scale: [1, 1, 0.9] },

  // ── Horns ──
  { name: "horn_l", type: "cone", jointId: "head", radiusTop: 0.002, radiusBottom: 0.015, height: 0.04, color: COLORS.horn, offset: [-0.03, 0.07, 0] },
  { name: "horn_r", type: "cone", jointId: "head", radiusTop: 0.002, radiusBottom: 0.015, height: 0.04, color: COLORS.horn, offset: [0.03, 0.07, 0] },

  // ── Eyes ──
  { name: "eye_l", type: "sphere", jointId: "head", radius: 0.018, color: COLORS.eye, offset: [-0.02, 0.02, 0.075] },
  { name: "eye_r", type: "sphere", jointId: "head", radius: 0.018, color: COLORS.eye, offset: [0.02, 0.02, 0.075] },

  // ── Mouth + tongue ──
  { name: "mouth", type: "torus", jointId: "head", radius: 0.02, color: "#5D4037", offset: [0, -0.015, 0.075] },
  { name: "tongue", type: "sphere", jointId: "head", radius: 0.01, color: COLORS.tongue, offset: [0, -0.02, 0.082] },

  // ── Arms ──
  { name: "l_upper_arm", type: "cylinder", parentId: "left_shoulder", childId: "left_elbow", radius: 0.03, color: COLORS.body },
  { name: "l_forearm", type: "cylinder", parentId: "left_elbow", childId: "left_wrist", radius: 0.025, color: COLORS.body },
  { name: "l_paw", type: "sphere", jointId: "left_hand", radius: 0.025, color: COLORS.paw },

  { name: "r_upper_arm", type: "cylinder", parentId: "right_shoulder", childId: "right_elbow", radius: 0.03, color: COLORS.body },
  { name: "r_forearm", type: "cylinder", parentId: "right_elbow", childId: "right_wrist", radius: 0.025, color: COLORS.body },
  { name: "r_paw", type: "sphere", jointId: "right_hand", radius: 0.025, color: COLORS.paw },

  // ── Legs ──
  { name: "l_thigh", type: "cylinder", parentId: "left_hip", childId: "left_knee", radius: 0.035, color: COLORS.body },
  { name: "l_shin", type: "cylinder", parentId: "left_knee", childId: "left_ankle", radius: 0.03, color: COLORS.body },
  { name: "l_foot", type: "sphere", jointId: "left_foot", radius: 0.03, color: COLORS.paw, scale: [1, 0.6, 1.2] },

  { name: "r_thigh", type: "cylinder", parentId: "right_hip", childId: "right_knee", radius: 0.035, color: COLORS.body },
  { name: "r_shin", type: "cylinder", parentId: "right_knee", childId: "right_ankle", radius: 0.03, color: COLORS.body },
  { name: "r_foot", type: "sphere", jointId: "right_foot", radius: 0.03, color: COLORS.paw, scale: [1, 0.6, 1.2] },

  // ── Tail ──
  { name: "tail_0", type: "sphere", jointId: "hip_center", radius: 0.025, color: COLORS.body, offset: [0, -0.01, -0.08] },
  { name: "tail_1", type: "sphere", jointId: "hip_center", radius: 0.022, color: COLORS.body, offset: [0, 0.005, -0.12] },
  { name: "tail_2", type: "sphere", jointId: "hip_center", radius: 0.018, color: COLORS.body, offset: [0, 0.02, -0.155] },
  { name: "tail_3", type: "sphere", jointId: "hip_center", radius: 0.014, color: COLORS.tail, offset: [0, 0.035, -0.185] },
  { name: "tail_4", type: "sphere", jointId: "hip_center", radius: 0.01, color: COLORS.tail, offset: [0, 0.05, -0.21] },

  // ── Wings ──
  { name: "wing_l", type: "box", jointId: "chest", color: COLORS.wing, offset: [-0.08, 0.02, -0.03] },
  { name: "wing_r", type: "box", jointId: "chest", color: COLORS.wing, offset: [0.08, 0.02, -0.03] },
];

// ─── Naigame Character Mesh ────────────────────────────────────────

function NaigameCharacter({ joints }: { joints: JointData[] }) {
  const groupRef = useRef<THREE.Group>(null);
  const dataRef = useRef({ joints });
  dataRef.current = { joints };

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    for (const seg of SEGMENTS) {
      let mesh: THREE.Mesh;

      const mat = new THREE.MeshStandardMaterial({
        color: seg.color,
        roughness: 0.3,
        metalness: 0.05,
      });

      switch (seg.type) {
        case "body-sphere":
        case "sphere": {
          const geo = new THREE.SphereGeometry(seg.radius ?? 0.04, 16, 16);
          mesh = new THREE.Mesh(geo, mat);
          break;
        }
        case "cylinder": {
          const r = seg.radius ?? 0.03;
          const geo = new THREE.CylinderGeometry(r, r, 1, 8);
          mesh = new THREE.Mesh(geo, mat);
          break;
        }
        case "cone": {
          const geo = new THREE.ConeGeometry(seg.radiusBottom ?? 0.015, seg.height ?? 0.04, 8);
          geo.translate(0, (seg.height ?? 0.04) / 2, 0); // pivot at base
          mesh = new THREE.Mesh(geo, mat);
          break;
        }
        case "box": {
          const geo = new THREE.BoxGeometry(0.06, 0.04, 0.015);
          mesh = new THREE.Mesh(geo, mat);
          break;
        }
        case "torus": {
          const geo = new THREE.TorusGeometry(seg.radius ?? 0.02, 0.004, 8, 12, Math.PI);
          mesh = new THREE.Mesh(geo, mat);
          break;
        }
      }

      mesh.name = seg.name;
      mesh.visible = false;
      mesh.castShadow = true;
      group.add(mesh);
    }

    return () => {
      while (group.children.length > 0) {
        const child = group.children[0];
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
        group.remove(child);
      }
    };
  }, []);

  useFrame(() => {
    const group = groupRef.current;
    const d = dataRef.current;
    if (!group) return;

    // Build position map
    const posMap = new Map<string, THREE.Vector3>();
    for (const j of d.joints) {
      posMap.set(j.id, _v.set(j.pos.x, j.pos.y, j.pos.z).clone());
    }

    for (const seg of SEGMENTS) {
      const mesh = group.getObjectByName(seg.name) as THREE.Mesh | undefined;
      if (!mesh) continue;

      if (seg.type === "body-sphere" && seg.jointId) {
        const pos = posMap.get(seg.jointId);
        if (!pos) { mesh.visible = false; continue; }
        mesh.visible = true;
        mesh.position.copy(pos);
        if (seg.scale) mesh.scale.set(seg.scale[0], seg.scale[1], seg.scale[2]);
        else mesh.scale.setScalar(1);
        continue;
      }

      if ((seg.type === "sphere" || seg.type === "cone" || seg.type === "box" || seg.type === "torus") && seg.jointId) {
        const pos = posMap.get(seg.jointId);
        if (!pos) { mesh.visible = false; continue; }
        mesh.visible = true;
        mesh.position.set(
          pos.x + (seg.offset?.[0] ?? 0),
          pos.y + (seg.offset?.[1] ?? 0),
          pos.z + (seg.offset?.[2] ?? 0),
        );
        if (seg.scale) mesh.scale.set(seg.scale[0], seg.scale[1], seg.scale[2]);
        else mesh.scale.setScalar(1);

        // Cones point upward from their offset position
        if (seg.type === "cone") {
          mesh.quaternion.identity();
        }
        // Mouth torus faces forward
        if (seg.type === "torus") {
          mesh.quaternion.setFromUnitVectors(_up, new THREE.Vector3(0, 0, 1));
        }
        continue;
      }

      // Cylinder between two joints
      if (seg.type === "cylinder" && seg.parentId && seg.childId) {
        const start = posMap.get(seg.parentId);
        const end = posMap.get(seg.childId);
        if (!start || !end) { mesh.visible = false; continue; }

        const len = _v2.copy(end).sub(start).length();
        if (len < 0.001) { mesh.visible = false; continue; }

        mesh.visible = true;
        _mid.copy(start).add(end).multiplyScalar(0.5);
        mesh.position.copy(_mid);
        _v2.copy(end).sub(start).normalize();
        mesh.quaternion.setFromUnitVectors(_up, _v2);
        mesh.scale.set(1, len, 1);
      }
    }
  });

  return <group ref={groupRef} />;
}

// ─── Scene Setup ────────────────────────────────────────────────────

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

// ─── Exported Component ─────────────────────────────────────────────

export function CartoonViewer3D({
  joints,
  showControls = true,
  height = "400px",
}: CartoonViewer3DProps) {
  return (
    <div style={{ width: "100%", height, position: "relative" }}>
      <Canvas
        camera={{ position: [1.5, 1, 2], fov: 50 }}
        gl={{ antialias: true }}
      >
        <SceneLights />
        <CameraInit />
        <NaigameCharacter joints={joints} />
        {showControls && <OrbitControls enableDamping dampingFactor={0.1} />}
      </Canvas>
    </div>
  );
}
