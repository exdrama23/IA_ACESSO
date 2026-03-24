import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { vertexShader, fragmentShader } from "./Shaders";
import { useAppStore } from "../../store/useAppStore";
import { ContactShadows, Environment } from "@react-three/drei";
import { VirtualHand } from "../VirtualHand";

function Boca() {
  const lineRef = useRef<THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>>(null);
  const { status } = useAppStore();
  
  const points = useMemo(() => {
    const p = [];
    for (let i = 0; i <= 64; i++) {
      p.push(new THREE.Vector3((i / 64 - 0.5) * 0.6, 0, 0));
    }
    return p;
  }, []);

  const positionsArray = useMemo(
    () => new Float32Array(points.flatMap((p) => [p.x, p.y, p.z])),
    [points]
  );

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positionsArray, 3));
    return g;
  }, [positionsArray]);

  const mouthMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.8,
        depthTest: false,
        toneMapped: false,
      }),
    []
  );

  const mouthLine = useMemo(
    () => new THREE.Line(geometry, mouthMaterial),
    [geometry, mouthMaterial]
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
      mouthMaterial.dispose();
    };
  }, [geometry, mouthMaterial]);

  useFrame((state) => {
    if (!lineRef.current) return;
    const time = state.clock.getElapsedTime();
    const targetOpacity = status === "speaking" ? 0.8 : 0.0;
    
    lineRef.current.material.opacity = THREE.MathUtils.lerp(
      lineRef.current.material.opacity,
      targetOpacity,
      0.1
    );

    if (lineRef.current.material.opacity < 0.01) {
      lineRef.current.visible = false;
      return;
    } else {
      lineRef.current.visible = true;
    }

    let volumeAtual = 0.01;
    if (status === "speaking") {
      volumeAtual = 0.1 + Math.sin(time * 10) * 0.05;
    }

    const positions = lineRef.current.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i <= 64; i++) {
      const x = (i / 64 - 0.5);
      const envelope = Math.cos(x * Math.PI); 
      const freq = 15.0;
      const wave = Math.sin(x * 20 + time * freq);
      const y = wave * volumeAtual * envelope;
      positions.setY(i, y);
    }
    positions.needsUpdate = true;
  });

  return (
    <primitive
      object={mouthLine}
      ref={lineRef}
      position={[0, -0.25, 0.85]}
      renderOrder={999}
    />
  );
}

function Olhos() {
  const olhosRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!olhosRef.current) return;
    const time = state.clock.getElapsedTime();
    const piscar = Math.pow(Math.sin(time * 2.0), 20) > 0.9 ? 0.1 : 1.0;
    olhosRef.current.scale.y = THREE.MathUtils.lerp(olhosRef.current.scale.y, piscar, 0.3);
  });

  return (
    <group ref={olhosRef} position={[0, 0.2, 0.85]}>
      <mesh position={[-0.25, 0, 0]} renderOrder={999}>
        <capsuleGeometry args={[0.04, 0.08, 4, 16]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} depthTest={false} /> 
      </mesh>
      <mesh position={[0.25, 0, 0]} renderOrder={999}>
        <capsuleGeometry args={[0.04, 0.08, 4, 16]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} depthTest={false} />
      </mesh>
    </group>
  );
}

function IAVisual() {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const { status, cursorPosition, isUserPresent } = useAppStore();
  const { size, viewport } = useThree();

  const isPortrait = size.height > size.width;

  const targetPoint = useRef(new THREE.Vector3(0, 0, 0));
  const currentPoint = useRef(new THREE.Vector3(0, 0, 0));

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uIntensity: { value: 0.15 },
      uState: { value: 0 },
      uMouse: { value: new THREE.Vector3(0, 0, 0) },
      uIsUserPresent: { value: 0.0 },
    }),
    []
  );

  useFrame((state) => {
    if (!material.current || !mesh.current) return;

    const time = state.clock.getElapsedTime();
    material.current.uniforms.uTime.value = time;
    material.current.uniforms.uIsUserPresent.value = isUserPresent ? 1.0 : 0.0;

    let targetIntensity = 0.15;
    let targetState = 0;

    switch (status) {
      case "listening": targetIntensity = 0.3; targetState = 1.0; break;
      case "thinking": targetIntensity = 0.8; targetState = 2.0; break;
      case "speaking": targetIntensity = 0.45; targetState = 3.0; break;
      default: targetIntensity = 0.15; targetState = 0.0;
    }

    material.current.uniforms.uIntensity.value = THREE.MathUtils.lerp(
      material.current.uniforms.uIntensity.value,
      targetIntensity,
      0.05
    );
    material.current.uniforms.uState.value = targetState;

    if (isUserPresent) {
      targetPoint.current.copy(cursorPosition);
    } else {
      targetPoint.current.x = (state.pointer.x * viewport.width) / 2;
      targetPoint.current.y = (state.pointer.y * viewport.height) / 2;
      targetPoint.current.z = 1.0;
    }

    currentPoint.current.lerp(targetPoint.current, 0.25);
    material.current.uniforms.uMouse.value.copy(currentPoint.current);

    const swayX = Math.sin(time * 0.5) * 0.05;
    const swayY = Math.cos(time * 0.3) * 0.1;

    const targetRotationX = (-(currentPoint.current.y / viewport.height) * 2) + swayX;
    const targetRotationY = ((currentPoint.current.x / viewport.width) * 2) + swayY;

    mesh.current.rotation.x = THREE.MathUtils.lerp(mesh.current.rotation.x, targetRotationX, 0.25); 
    mesh.current.rotation.y = THREE.MathUtils.lerp(mesh.current.rotation.y, targetRotationY, 0.25); 
    
    mesh.current.position.y = Math.sin(time * 0.7) * 0.02;
    
    const baseScale = isPortrait ? 0.75 : 1.0;
    mesh.current.scale.set(baseScale, baseScale, baseScale);
  });

  return (
    <mesh ref={mesh} castShadow>
      <sphereGeometry args={[0.9, 64, 64]} />
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
      <Olhos />
      <Boca />
    </mesh>
  );
}

export function Avatar3D() {
  return (
    <div className="absolute inset-0 w-full h-full -z-10 bg-white">
      <Canvas 
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: [0, 0, 5], fov: 35 }}
        gl={{ antialias: true }}
        onCreated={() => {

        }}
      >
        <color attach="background" args={['#ffffff']} />

        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={2} color="#ff3333" />
        <pointLight position={[-10, -10, -10]} intensity={1.5} color="#ff0055" />
        <spotLight position={[0, 5, 5]} angle={0.3} penumbra={1} intensity={2} castShadow />

        <IAVisual />
        <VirtualHand />

        <ContactShadows 
          position={[0, -1.8, 0]} 
          opacity={0.3} 
          scale={6} 
          blur={2} 
          far={4} 
          color="#000000"
        />

        <Environment preset="studio" />
      </Canvas>
    </div>
  );
}
