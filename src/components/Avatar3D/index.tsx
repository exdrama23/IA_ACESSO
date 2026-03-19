import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import * as THREE from "three";
import { vertexShader, fragmentShader } from "./Shaders";
import { useAppStore } from "../../store/useAppStore";
import { ContactShadows, Environment } from "@react-three/drei";

function IAVisual() {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const { status } = useAppStore();
  const { size } = useThree();

  const isPortrait = size.height > size.width;

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uIntensity: { value: 0.15 },
      uState: { value: 0 },
    }),
    []
  );

  useFrame((state) => {
    if (!material.current) return;

    const time = state.clock.getElapsedTime();
    material.current.uniforms.uTime.value = time;

    let targetIntensity = 0.15;
    let targetState = 0;

    switch (status) {
      case "listening":
        targetIntensity = 0.3;
        targetState = 1.0;
        break;
      case "thinking":
        targetIntensity = 0.8; 
        targetState = 2.0;
        break;
      case "speaking":
        targetIntensity = 0.45;
        targetState = 3.0;
        break;
      default:
        targetIntensity = 0.15;
        targetState = 0.0;
    }

    material.current.uniforms.uIntensity.value = THREE.MathUtils.lerp(
      material.current.uniforms.uIntensity.value,
      targetIntensity,
      0.05
    );
    material.current.uniforms.uState.value = targetState;

    if (mesh.current) {
      mesh.current.rotation.y += 0.005;
      mesh.current.position.set(0, 0, 0);
      
      const baseScale = isPortrait ? 0.75 : 1.0;
      mesh.current.scale.set(baseScale, baseScale, baseScale);
    }
  });

  return (
    <mesh ref={mesh} castShadow>
      <sphereGeometry args={[0.9, 128, 128]} />
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

export function Avatar3D() {
  return (
    <div className="absolute inset-0 w-full h-full bg-white -z-10">
      <Canvas 
        shadows 
        camera={{ position: [0, 0, 5], fov: 35 }}
        style={{ background: '#ffffff' }}
      >
        <color attach="background" args={['#ffffff']} />
        
        <ambientLight intensity={1.5} />
        <pointLight position={[10, 10, 10]} intensity={2} color="#ff3333" />
        <pointLight position={[-10, -10, -10]} intensity={1.5} color="#ff0055" />
        
        <IAVisual />

        <ContactShadows 
          position={[0, -1.2, 0]} 
          opacity={0.3} 
          scale={6} 
          blur={2} 
          far={4} 
        />

        <Environment preset="studio" />
      </Canvas>
    </div>
  );
}
