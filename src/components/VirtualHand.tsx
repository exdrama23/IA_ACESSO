import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useAppStore } from "../store/useAppStore";

const BASE_SIZE = 0.007;
const SMOOTHING = 0.6; 
const UPDATE_INTERVAL = 0; 
const CURSOR_UPDATE_INTERVAL = 0; 
const CURSOR_MOVE_EPSILON = 0.001; 
const DEPTH_SCALE = 5;
const MIN_DEPTH_DAMP = 0.45;
const CENTERING_STRENGTH = 0.35;
const MAX_CENTER_SHIFT = 0.12;
const PORTRAIT_ROTATION_DEG = 90;
const PORTRAIT_MIRROR_X = false;
const PORTRAIT_MIRROR_Y = false;
const PORTRAIT_SCREEN_MIRROR_X = true;

function clamp01(value: number) {
  return THREE.MathUtils.clamp(value, 0, 1);
}

function rotateAroundCenter(x: number, y: number, angleDeg: number) {
  if (angleDeg === 0) return { x, y };

  const radians = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = x - 0.5;
  const dy = y - 0.5;

  const rotatedX = dx * cos - dy * sin + 0.5;
  const rotatedY = dx * sin + dy * cos + 0.5;

  return {
    x: clamp01(rotatedX),
    y: clamp01(rotatedY)
  };
}

function mapPortraitPoint(x: number, y: number) {
  const rotated = rotateAroundCenter(x, y, PORTRAIT_ROTATION_DEG);
  const mirroredX = PORTRAIT_MIRROR_X ? 1 - rotated.x : rotated.x;
  const mirroredY = PORTRAIT_MIRROR_Y ? 1 - rotated.y : rotated.y;
  return { x: mirroredX, y: mirroredY };
}

export function VirtualHand() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { viewport } = useThree();
  const handLandmarks = useAppStore((state) => state.handLandmarks);
  const isPinching = useAppStore((state) => state.isPinching);
  const setCursorPosition = useAppStore((state) => state.setCursorPosition);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const cameraWorldPosition = useMemo(() => new THREE.Vector3(), []);
  const targetPosition = useMemo(() => new THREE.Vector3(), []);
  const cursorTemp = useMemo(() => new THREE.Vector3(), []);
  const lastCursorSent = useRef(new THREE.Vector3());
  const lastUpdateRef = useRef(0);
  const lastCursorUpdateRef = useRef(0);
  
  const previousPositions = useRef<THREE.Vector3[]>(
    Array(21).fill(0).map(() => new THREE.Vector3())
  );

  useFrame(({ camera, clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    if (clock.elapsedTime - lastUpdateRef.current < UPDATE_INTERVAL) return;
    lastUpdateRef.current = clock.elapsedTime;

    camera.getWorldPosition(cameraWorldPosition);

    if (handLandmarks.length === 0) {
      mesh.visible = false;
      return;
    }

    mesh.visible = true;

    const aspectRatio = viewport.width / viewport.height;
    const depthDamp = THREE.MathUtils.clamp(aspectRatio, MIN_DEPTH_DAMP, 1);
    const isPortrait = viewport.height > viewport.width;

    const maxX = viewport.width * 0.49;
    const maxY = viewport.height * 0.49;
    const handCenterX =
      handLandmarks.reduce((sum, landmark) => {
        const normalized = isPortrait
          ? mapPortraitPoint(landmark.x, landmark.y)
          : { x: landmark.x, y: landmark.y };
        return sum + normalized.x;
      }, 0) / handLandmarks.length;
    const centerShift = THREE.MathUtils.clamp(
      (handCenterX - 0.5) * CENTERING_STRENGTH,
      -MAX_CENTER_SHIFT,
      MAX_CENTER_SHIFT
    );

    handLandmarks.forEach((landmark, i) => {
      const normalized = isPortrait
        ? mapPortraitPoint(landmark.x, landmark.y)
        : { x: landmark.x, y: landmark.y };
      const normalizedX = clamp01(normalized.x + centerShift);
      const normalizedY = normalized.y;

      const xDirection = isPortrait && PORTRAIT_SCREEN_MIRROR_X ? 1 : -1;
      const mappedX = (normalizedX - 0.5) * xDirection * viewport.width;
      const mappedY = (normalizedY - 0.5) * -viewport.height;
      const targetX = THREE.MathUtils.clamp(mappedX, -maxX, maxX);
      const targetY = THREE.MathUtils.clamp(mappedY, -maxY, maxY);
      const targetZ = landmark.z * -DEPTH_SCALE * depthDamp;

 
      const currentPos = previousPositions.current[i];
      targetPosition.set(targetX, targetY, targetZ);
      currentPos.lerp(targetPosition, SMOOTHING);
      dummy.position.copy(currentPos);


      const distanceToCamera = dummy.position.distanceTo(cameraWorldPosition);
      let fixedScale = distanceToCamera * BASE_SIZE;

      if (i === 8) {
        if (isPinching) fixedScale *= 1.5;

        const canUpdateCursor =
          clock.elapsedTime - lastCursorUpdateRef.current >= CURSOR_UPDATE_INTERVAL;

        if (canUpdateCursor) {
          cursorTemp.copy(currentPos);
          const movedEnough = cursorTemp.distanceTo(lastCursorSent.current) >= CURSOR_MOVE_EPSILON;

          if (movedEnough) {
            setCursorPosition(cursorTemp.clone());
            lastCursorSent.current.copy(cursorTemp);
            lastCursorUpdateRef.current = clock.elapsedTime;
          }
        }
      }

      dummy.scale.setScalar(fixedScale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh 
      ref={meshRef} 
      args={[undefined, undefined, 21]} 
      renderOrder={1000}
    >
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial 
        color="#000000" 
        transparent 
        opacity={0.8} 
        depthTest={false} 
      />
    </instancedMesh>
  );
}
