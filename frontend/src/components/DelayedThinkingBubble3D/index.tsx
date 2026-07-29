import { useRef, useMemo, useEffect, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { speechBubbleVertexShader, speechBubbleFragmentShader } from "../Avatar3D/Shaders";
import { useAppStore } from "../../store/useAppStore";

export const DelayedThinkingBubble3D = () => {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { status } = useAppStore();

  const geometry = useMemo(() => {
    return new THREE.IcosahedronGeometry(0.4, 4);
  }, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: speechBubbleVertexShader,
        fragmentShader: speechBubbleFragmentShader,
      }),
    []
  );

  useEffect(() => {
    if (status === "thinking" || status === "speaking") {
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      setIsVisible(false);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [status]);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.z += 0.01;
    }
  });

  if (!isVisible) return null;

  return (
    <group ref={groupRef} position={[0, 0.8, 0.5]}>
      <mesh geometry={geometry} material={material} />
    </group>
  );
};
