import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { useAppStore } from "../store/useAppStore";

export function HolographicUI() {
  const buttonRef = useRef<THREE.Mesh>(null);
  const wasPinchingRef = useRef(false);
  const [hovered, setHover] = useState(false);
  const { cursorPosition, isPinching } = useAppStore();
  
  useFrame(() => {
    if (!buttonRef.current) return;

    const distance = cursorPosition.distanceTo(buttonRef.current.position);

    const isNear = distance < 0.2;
    setHover(isNear);

    const clickGesture = isNear && isPinching && !wasPinchingRef.current;

    if (clickGesture) {
      console.log("PINCH CLICK!");
    }

    if (isNear && isPinching) {
      buttonRef.current.scale.setScalar(0.9);
    } else {
      buttonRef.current.scale.setScalar(1.0);
    }

    wasPinchingRef.current = isPinching;
  });

  return (
    <group position={[2, 0, 0]}>
      <mesh ref={buttonRef}>
        <planeGeometry args={[0.5, 0.2]} />
        <meshStandardMaterial 
          color={hovered ? "#00ffcc" : "#0055ff"} 
          transparent 
          opacity={0.6} 
          side={THREE.DoubleSide}
        />
        <Text position={[0, 0, 0.01]} fontSize={0.05} color="white">
          HOLOGRAPHIC BTN
        </Text>
      </mesh>
      
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[0.55, 0.25]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.1} />
      </mesh>
    </group>
  );
}
