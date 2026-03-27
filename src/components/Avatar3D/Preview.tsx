import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useMemo, useState, useEffect } from "react";
import * as THREE from "three";
import { vertexShader, fragmentShader } from "./Shaders";
import { useAppStore } from "../../store/useAppStore";

type AnimationType = "idle" | "speaking" | "listening";
type VoiceGender = "feminine" | "masculine" | "neutral";

interface Avatar3DPreviewProps {
  animationType?: AnimationType;
  voiceGender?: VoiceGender;
}

function OlhosPreview() {
  return (
    <group position={[0, 0.2, 0.85]}>
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

// Versão animada da boca (com deformação do shader)
function BocaAnimadaPreview({ animationType }: { animationType: AnimationType }) {
  const { activeVoiceId } = useAppStore();

  const getVoiceColorValue = (voiceId: string): number => {
    const voiceMap: { [key: string]: number } = {
      "hpp4J3VqNfWAUOO0d1Us": 0.0,
      "21m00Tcm4TlvDq8ikWAM": 0.33,
      "nPczCjzI2aLN5dFF5skQ": 0.66,
    };
    return voiceMap[voiceId] || 0.0;
  };

  const points = useMemo(() => {
    const p = [];
    for (let i = 0; i <= 64; i++) {
      p.push(new THREE.Vector3((i / 64 - 0.5) * 0.6, 0, 0));
    }
    return p;
  }, []);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(points.flatMap((p) => [p.x, p.y, p.z]));
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [points]);

  const mouthVertexShader = useMemo(() => `
    uniform float uTime;
    uniform float uIntensity;
    
    void main() {
      vec3 pos = position;
      float wave = sin(uTime * 2.0) * uIntensity * 0.15;
      pos.y += wave;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `, []);

  const mouthFragmentShader = useMemo(() => `
    uniform float uVoiceColor;
    
    void main() {
      vec3 color;
      if (uVoiceColor < 0.2) {
        color = vec3(1.0, 0.1, 0.2);
      } else if (uVoiceColor < 0.5) {
        color = vec3(0.2, 1.0, 0.6);
      } else {
        color = vec3(0.4, 0.6, 1.0);
      }
      gl_FragColor = vec4(color, 0.8);
    }
  `, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uIntensity: { value: 0.3 },
      uVoiceColor: { value: getVoiceColorValue(activeVoiceId) },
    }),
    []
  );

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: mouthVertexShader,
        fragmentShader: mouthFragmentShader,
        uniforms,
        transparent: true,
      }),
    [mouthVertexShader, mouthFragmentShader, uniforms]
  );

  const line = useMemo(() => {
    const l = new THREE.Line(geometry, material);
    l.position.set(0, -0.25, 0.85);
    (l as any).renderOrder = 999;
    return l;
  }, [geometry, material]);

  useEffect(() => {
    if (line.material instanceof THREE.ShaderMaterial) {
      line.material.uniforms.uVoiceColor.value = getVoiceColorValue(activeVoiceId);
    }
  }, [activeVoiceId, line]);

  useFrame((state) => {
    if (line.material instanceof THREE.ShaderMaterial) {
      line.material.uniforms.uTime.value = state.clock.getElapsedTime();
      
      // Sincronizar intensidade com tipo de animação
      if (animationType === "speaking") {
        line.material.uniforms.uIntensity.value = 0.5;
      } else if (animationType === "listening") {
        line.material.uniforms.uIntensity.value = 0.3;
      } else {
        line.material.uniforms.uIntensity.value = 0.15;
      }
    }
  });

  return <primitive object={line} />;
}

// Componente visual 3D (versão preview)
function IAVisualPreview({ animationType = "idle" }: Avatar3DPreviewProps) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const { activeVoiceId } = useAppStore();

  const getVoiceColorValue = (voiceId: string): number => {
    const voiceMap: { [key: string]: number } = {
      "hpp4J3VqNfWAUOO0d1Us": 0.0,
      "21m00Tcm4TlvDq8ikWAM": 0.33,
      "nPczCjzI2aLN5dFF5skQ": 0.66,
    };
    return voiceMap[voiceId] || 0.0;
  };

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uIntensity: { value: 0.2 },
      uState: { value: 0 },
      uMouse: { value: new THREE.Vector3(0, 0, 0) },
      uIsUserPresent: { value: 0.0 },
      uVoiceColor: { value: getVoiceColorValue(activeVoiceId) },
    }),
    []
  );

  useEffect(() => {
    if (material.current) {
      material.current.uniforms.uVoiceColor.value = getVoiceColorValue(activeVoiceId);
    }
  }, [activeVoiceId]);

  useFrame((state) => {
    if (!material.current || !mesh.current) return;

    const time = state.clock.getElapsedTime();
    material.current.uniforms.uTime.value = time;

    if (animationType === "speaking") {
      material.current.uniforms.uIntensity.value = 0.5;
      
      const swayX = Math.sin(time * 0.8) * 0.06;
      const swayY = Math.cos(time * 0.6) * 0.08;
      const bobY = Math.sin(time * 1.2) * 0.03;

      mesh.current.rotation.x = swayX;
      mesh.current.rotation.y = swayY;
      mesh.current.position.y = bobY;
      
      const pulse = 1 + Math.sin(time * 2) * 0.02;
      mesh.current.scale.set(pulse, pulse, pulse);
    } else if (animationType === "listening") {
      material.current.uniforms.uIntensity.value = 0.3;
      
      const tiltX = Math.sin(time * 0.4) * 0.04;
      const tiltY = Math.cos(time * 0.3) * 0.05;
      const focusY = Math.sin(time * 0.6) * 0.015;

      mesh.current.rotation.x = tiltX;
      mesh.current.rotation.y = tiltY;
      mesh.current.position.y = focusY;
      
      mesh.current.scale.set(1, 1, 1);
    } else {
      material.current.uniforms.uIntensity.value = 0.15;
      
      const swayX = Math.sin(time * 0.3) * 0.02;
      const swayY = Math.cos(time * 0.2) * 0.03;

      mesh.current.rotation.x = swayX;
      mesh.current.rotation.y = swayY;
      mesh.current.position.y = Math.sin(time * 0.5) * 0.01;
      
      mesh.current.scale.set(1, 1, 1);
    }
  });

  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[0.9, 64, 64]} />
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
      <OlhosPreview />
      <BocaAnimadaPreview animationType={animationType} />
    </mesh>
  );
}

export function Avatar3DPreview() {
  const [animationType, setAnimationType] = useState<AnimationType>("idle");

  return (
    <div className="w-full h-full flex flex-col bg-black rounded-lg overflow-hidden">
      <div className="flex-1 relative">
        <Canvas
          camera={{ position: [0, 0, 2.8], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          style={{ width: "100%", height: "100%" }}
        >
          <color attach="background" args={["#000000"]} />

          <ambientLight intensity={0.6} />
          <pointLight position={[8, 8, 8]} intensity={1.8} color="#ff3333" />
          <pointLight position={[-8, -8, -8]} intensity={1.2} color="#ff0055" />
          <spotLight position={[0, 4, 3]} angle={0.4} penumbra={1} intensity={1.5} />

          <IAVisualPreview animationType={animationType} />
        </Canvas>
      </div>

      <div className="bg-white border-t border-gray-100 p-4">
        <div className="flex items-center gap-4">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest w-20">Animação</label>
          <div className="flex-1 relative">
            <select
              value={animationType}
              onChange={(e) => setAnimationType(e.target.value as AnimationType)}
              className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase text-gray-700 outline-none appearance-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="idle">Padrão</option>
              <option value="speaking">Falando</option>
              <option value="listening">Ouvindo</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[10px]">▼</div>
          </div>
        </div>
      </div>
    </div>
  );
}
