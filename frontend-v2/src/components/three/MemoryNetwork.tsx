import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function Network({ progress = 0 }: { progress?: number }) {
  const group = useRef<THREE.Group>(null);
  const lines = useRef<THREE.LineSegments>(null);
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, linePositions, lineCount } = useMemo(() => {
    const N = 140;
    const positions = new Float32Array(N * 3);
    const target = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      // Cluster on a soft sphere
      const r = 4 + Math.random() * 2.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      target[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      target[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
      target[i * 3 + 2] = r * Math.cos(phi);
      positions[i * 3] = target[i * 3];
      positions[i * 3 + 1] = target[i * 3 + 1];
      positions[i * 3 + 2] = target[i * 3 + 2];
    }
    // Build edges between nearest neighbours
    const edges: number[] = [];
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = target[i * 3] - target[j * 3];
        const dy = target[i * 3 + 1] - target[j * 3 + 1];
        const dz = target[i * 3 + 2] - target[j * 3 + 2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < 1.6) {
          edges.push(target[i * 3], target[i * 3 + 1], target[i * 3 + 2]);
          edges.push(target[j * 3], target[j * 3 + 1], target[j * 3 + 2]);
        }
      }
    }
    return {
      positions,
      linePositions: new Float32Array(edges),
      lineCount: edges.length / 6,
    };
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (group.current) {
      group.current.rotation.y = t * 0.05;
      group.current.rotation.x = Math.sin(t * 0.1) * 0.08;
    }
    if (lines.current) {
      const mat = lines.current.material as THREE.LineBasicMaterial;
      mat.opacity = 0.05 + progress * 0.35;
    }
    if (pointsRef.current) {
      const mat = pointsRef.current.material as THREE.PointsMaterial;
      mat.opacity = 0.5 + progress * 0.5;
    }
  });

  return (
    <group ref={group}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.05}
          color="#D4A373"
          transparent
          opacity={0.9}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <lineSegments ref={lines}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[linePositions, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color="#6FAFC7"
          transparent
          opacity={0.2}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
      {/* Ambient drift particles */}
      <Drift />
    </group>
  );
}

function Drift() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const N = 600;
    const arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 22;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 14;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 22;
    }
    return arr;
  }, []);
  useFrame((s) => {
    if (ref.current) {
      ref.current.rotation.y = s.clock.elapsedTime * 0.015;
    }
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.015}
        color="#F8F7F2"
        transparent
        opacity={0.45}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export function MemoryNetwork({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 11], fov: 55 }}
        dpr={[1, 1.6]}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={["#0a1a13"]} />
        <fog attach="fog" args={["#0a1a13", 9, 24]} />
        <ambientLight intensity={0.55} />
        <pointLight position={[5, 5, 5]} intensity={1.6} color="#3FA37A" />
        <pointLight position={[-6, -3, 2]} intensity={1.1} color="#7BC6D9" />
        <pointLight position={[0, -6, 4]} intensity={0.7} color="#D4A373" />
        <Network progress={1} />
      </Canvas>
    </div>
  );
}
