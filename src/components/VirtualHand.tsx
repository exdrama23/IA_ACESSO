import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useAppStore } from "../store/useAppStore";

const BASE_SIZE = 0.007;
const SMOOTHING = 0.25;
const UPDATE_INTERVAL = 1 / 45; 
const CURSOR_UPDATE_INTERVAL = 1 / 30;
const CURSOR_MOVE_EPSILON = 0.003;
const PORTRAIT_X_GAIN = 0.9;
const PORTRAIT_Y_GAIN = 1.1;
const LANDSCAPE_X_GAIN = 1.0;
const LANDSCAPE_Y_GAIN = 1.0;

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

    const isPortrait = viewport.height > viewport.width;
    const gainX = isPortrait ? PORTRAIT_X_GAIN : LANDSCAPE_X_GAIN;
    const gainY = isPortrait ? PORTRAIT_Y_GAIN : LANDSCAPE_Y_GAIN;
    const maxX = viewport.width * 0.49;
    const maxY = viewport.height * 0.49;

    handLandmarks.forEach((landmark, i) => {

      const mappedX = (landmark.x - 0.5) * -viewport.width * gainX;
      const mappedY = (landmark.y - 0.5) * -viewport.height * gainY;
      const targetX = THREE.MathUtils.clamp(mappedX, -maxX, maxX);
      const targetY = THREE.MathUtils.clamp(mappedY, -maxY, maxY);
      const targetZ = landmark.z * -5;

 
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
