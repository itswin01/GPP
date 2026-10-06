"use client";

/**
 * 3D robot mascot, adapted from the supplied RobotHero component.
 *
 * Changes from the original: the marketing navbar (Product / Specs / Buy Now)
 * is removed — this is a sign-in screen, not a storefront — and the component
 * now accepts children so the login form can sit over the canvas.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";

class HeartCurve extends THREE.Curve<THREE.Vector3> {
  // THREE.Curve's constructor is protected in the typings; re-declaring it
  // here as public is what makes `new HeartCurve()` legal.
  constructor() {
    super();
  }

  getPoint(t: number, optionalTarget = new THREE.Vector3()) {
    t = t * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y =
      13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return optionalTarget.set(x * 0.002, (y + 6) * 0.002, 0);
  }
}

const sharedHeartCurve = new HeartCurve();

function ResponsiveGroup({ children, scale = 1 }: { children: React.ReactNode; scale?: number }) {
  const { viewport } = useThree();
  const s = Math.min(1.1, viewport.width / 3.5) * scale;
  return <group scale={s}>{children}</group>;
}

function GlassCapsule({ color, power, intensity }: { color: string; power: number; intensity: number }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      color: { value: new THREE.Color("#ffffff") },
      power: { value: 2.5 },
      intensity: { value: 0.6 },
    }),
    [],
  );

  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.color.value.set(color);
      materialRef.current.uniforms.power.value = power;
      materialRef.current.uniforms.intensity.value = intensity;
    }
  });

  return (
    <mesh>
      <sphereGeometry args={[0.3, 64, 64, 0, Math.PI * 2, 0, Math.PI]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vNormal;
          varying vec3 vViewPosition;
          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vViewPosition = -mvPosition.xyz;
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          uniform vec3 color;
          uniform float power;
          uniform float intensity;
          varying vec3 vNormal;
          varying vec3 vViewPosition;
          void main() {
            vec3 normal = normalize(vNormal);
            vec3 viewDir = normalize(vViewPosition);
            float fresnel = 1.0 - max(dot(viewDir, normal), 0.0);
            fresnel = pow(fresnel, power);
            gl_FragColor = vec4(color, fresnel * intensity);
          }
        `}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

const earBaseMat = new THREE.MeshStandardMaterial({ color: "#f0f0f0", roughness: 0.5 });
const earRingMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.3 });
const earCenterMat = new THREE.MeshStandardMaterial({ color: "#cccccc", roughness: 0.8 });
const antennaBaseMat = new THREE.MeshStandardMaterial({ color: "#999999", roughness: 0.4, metalness: 0.5 });
const antennaStickMat = new THREE.MeshStandardMaterial({ color: "#d0d0d0", roughness: 0.4, metalness: 0.2 });
const antennaTipMat = new THREE.MeshStandardMaterial({ color: "#00c9a7", roughness: 0.2, toneMapped: false });

function RobotEar({
  position,
  scale = 1,
  isLeft = false,
}: {
  position: [number, number, number];
  scale?: number;
  isLeft?: boolean;
}) {
  const dir = isLeft ? -1 : 1;
  return (
    <group position={position} scale={scale}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow material={earBaseMat}>
        <cylinderGeometry args={[0.04, 0.04, 0.025, 32]} />
      </mesh>
      <mesh position={[dir * 0.012, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow material={earRingMat}>
        <torusGeometry args={[0.032, 0.008, 16, 32]} />
      </mesh>
      <mesh position={[dir * 0.012, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow material={earCenterMat}>
        <cylinderGeometry args={[0.03, 0.03, 0.005, 32]} />
      </mesh>
      <group position={[dir * 0.015, 0.035, 0]} rotation={[-0.4, 0, 0]}>
        <mesh position={[0, 0.01, 0]} castShadow receiveShadow material={antennaBaseMat}>
          <cylinderGeometry args={[0.006, 0.008, 0.02, 16]} />
        </mesh>
        <mesh position={[0, 0.06, 0]} castShadow receiveShadow material={antennaStickMat}>
          <cylinderGeometry args={[0.003, 0.003, 0.1, 8]} />
        </mesh>
        <mesh position={[0, 0.11, 0]} castShadow receiveShadow material={antennaTipMat}>
          <sphereGeometry args={[0.006, 16, 16]} />
        </mesh>
      </group>
    </group>
  );
}

const eyeMat = new THREE.MeshBasicMaterial({
  color: new THREE.Color(2, 2, 2),
  toneMapped: false,
  transparent: true,
});
const heartMat = new THREE.MeshBasicMaterial({ color: "#00c9a7", toneMapped: false });

function RobotEye({
  position,
  rotation,
  scale = 1,
  blinkDuration = 0.15,
  blinkCycle = 3.0,
  isLovedRef,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  scale?: number;
  blinkDuration?: number;
  blinkCycle?: number;
  isLovedRef: React.MutableRefObject<boolean>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const normalEyesRef = useRef<THREE.Group>(null);
  const heartEyeRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current || !normalEyesRef.current || !heartEyeRef.current) return;
    const isHeart = isLovedRef.current;
    normalEyesRef.current.visible = !isHeart;
    heartEyeRef.current.visible = isHeart;

    const cycle = clock.getElapsedTime() % blinkCycle;
    let targetScaleY = 1;
    if (cycle < blinkDuration && !isHeart) {
      const progress = cycle / blinkDuration;
      targetScaleY = Math.max(0.05, 1.0 - Math.sin(progress * Math.PI));
    }
    groupRef.current.scale.set(scale, scale * targetScaleY, scale);
  });

  const { topPath, bottomPath } = useMemo(() => {
    const w = 0.025;
    const h = 0.035;
    const r = 0.02;
    const g = 0.005;

    const tPath = new THREE.CurvePath<THREE.Vector3>();
    tPath.add(new THREE.LineCurve3(new THREE.Vector3(-w, g, 0), new THREE.Vector3(-w, h - r, 0)));
    tPath.add(new THREE.QuadraticBezierCurve3(new THREE.Vector3(-w, h - r, 0), new THREE.Vector3(-w, h, 0), new THREE.Vector3(-w + r, h, 0)));
    tPath.add(new THREE.LineCurve3(new THREE.Vector3(-w + r, h, 0), new THREE.Vector3(w - r, h, 0)));
    tPath.add(new THREE.QuadraticBezierCurve3(new THREE.Vector3(w - r, h, 0), new THREE.Vector3(w, h, 0), new THREE.Vector3(w, h - r, 0)));
    tPath.add(new THREE.LineCurve3(new THREE.Vector3(w, h - r, 0), new THREE.Vector3(w, g, 0)));

    const bPath = new THREE.CurvePath<THREE.Vector3>();
    bPath.add(new THREE.LineCurve3(new THREE.Vector3(-w, -g, 0), new THREE.Vector3(-w, -(h - r), 0)));
    bPath.add(new THREE.QuadraticBezierCurve3(new THREE.Vector3(-w, -(h - r), 0), new THREE.Vector3(-w, -h, 0), new THREE.Vector3(-w + r, -h, 0)));
    bPath.add(new THREE.LineCurve3(new THREE.Vector3(-w + r, -h, 0), new THREE.Vector3(w - r, -h, 0)));
    bPath.add(new THREE.QuadraticBezierCurve3(new THREE.Vector3(w - r, -h, 0), new THREE.Vector3(w, -h, 0), new THREE.Vector3(w, -(h - r), 0)));
    bPath.add(new THREE.LineCurve3(new THREE.Vector3(w, -(h - r), 0), new THREE.Vector3(w, -g, 0)));

    return { topPath: tPath, bottomPath: bPath };
  }, []);

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <mesh ref={heartEyeRef} visible={false} material={heartMat}>
        <tubeGeometry args={[sharedHeartCurve, 64, 0.0035, 8, true]} />
      </mesh>
      <group ref={normalEyesRef}>
        <mesh material={eyeMat}>
          <tubeGeometry args={[topPath, 20, 0.0035, 8, false]} />
        </mesh>
        <mesh material={eyeMat}>
          <tubeGeometry args={[bottomPath, 20, 0.0035, 8, false]} />
        </mesh>
      </group>
    </group>
  );
}

function generatePbrTexturesAsync(): Promise<{ colorMap: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const size = 512;
      const canvasC = document.createElement("canvas");
      const canvasB = document.createElement("canvas");
      canvasC.width = canvasB.width = size;
      canvasC.height = canvasB.height = size;
      const ctxC = canvasC.getContext("2d");
      const ctxB = canvasB.getContext("2d");

      if (ctxC && ctxB) {
        ctxC.fillStyle = "#dcdcdc";
        ctxC.fillRect(0, 0, size, size);
        ctxB.fillStyle = "#808080";
        ctxB.fillRect(0, 0, size, size);

        for (let i = 0; i < 10000; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const r = 0.5 + Math.random() * 1.5;
          const isDark = Math.random() > 0.15;

          ctxC.beginPath();
          ctxC.arc(x, y, r, 0, Math.PI * 2);
          ctxC.fillStyle = isDark ? "#222222" : "#dddddd";
          ctxC.fill();

          ctxB.beginPath();
          ctxB.arc(x, y, r, 0, Math.PI * 2);
          ctxB.fillStyle = isDark ? "#000000" : "#ffffff";
          ctxB.fill();
        }
      }

      const texC = new THREE.CanvasTexture(canvasC);
      const texB = new THREE.CanvasTexture(canvasB);
      texC.wrapS = texB.wrapS = THREE.RepeatWrapping;
      texC.wrapT = texB.wrapT = THREE.RepeatWrapping;
      texC.repeat.set(6, 3);
      texB.repeat.set(6, 3);
      texC.needsUpdate = true;
      texB.needsUpdate = true;

      resolve({ colorMap: texC, bumpMap: texB });
    }, 0);
  });
}

function RobotPrototype({
  color = "#c4c4c4",
  screenColor = "#00c9a7",
  screenGlow = 1.2,
  blinkCycle = 3.0,
  metalness = 0.0,
}: {
  color?: string;
  screenColor?: string;
  screenGlow?: number;
  blinkCycle?: number;
  metalness?: number;
}) {
  const isLovedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);

  const [textures, setTextures] = useState<{
    colorMap: THREE.CanvasTexture | null;
    bumpMap: THREE.CanvasTexture | null;
  }>({ colorMap: null, bumpMap: null });

  const neckParams = {
    baseR: 0.215, baseH: -0.05, midR: 0.28, midH: 0.02,
    lipBottomR: 0.295, lipBottomH: 0.045, lipTopR: 0.27, lipTopH: 0.055,
    innerR: 0.1, innerDropH: 0.0,
  };
  const bodyParams = { bodyBevelR: 0.235, bodyBevelY: 0.34, bodyBevelT: 0.025 };

  const config = {
    moveSpeed: 0.35, bodyRotSpeed: 10.0, headRotSpeed: 20.0,
    bodyTiltX: 0.0, bodyTiltY: 0.95, headLookX: 0.3, headLookY: 1.8,
  };

  useFrame((state, delta) => {
    if (!bodyRef.current || !headRef.current) return;
    const dt = Math.min(delta, 0.1);
    const tx = state.pointer.x;
    const ty = state.pointer.y;

    const maxMoveX = state.viewport.width / 3.5;
    bodyRef.current.position.x = THREE.MathUtils.lerp(bodyRef.current.position.x, tx * maxMoveX, config.moveSpeed * dt);

    const relativeX = tx - bodyRef.current.position.x / 2.5;
    bodyRef.current.rotation.y = THREE.MathUtils.lerp(bodyRef.current.rotation.y, -relativeX * config.bodyTiltY, config.bodyRotSpeed * dt);
    bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, relativeX * relativeX * config.bodyTiltX - ty * 0.25, config.bodyRotSpeed * dt);
    bodyRef.current.rotation.z = THREE.MathUtils.lerp(bodyRef.current.rotation.z, -relativeX * 0.15, config.bodyRotSpeed * dt);

    headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, relativeX * config.headLookY, config.headRotSpeed * dt);
    headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, -ty * config.headLookX, config.headRotSpeed * dt);
  });

  useEffect(() => {
    let mounted = true;
    let generated: { colorMap: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } | null = null;

    generatePbrTexturesAsync().then((res) => {
      if (mounted) {
        generated = res;
        setTextures(res);
      } else {
        res.colorMap.dispose();
        res.bumpMap.dispose();
      }
    });

    return () => {
      mounted = false;
      if (generated) {
        generated.colorMap.dispose();
        generated.bumpMap.dispose();
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const neckProfile = useMemo(() => {
    const p: THREE.Vector2[] = [];
    p.push(new THREE.Vector2(neckParams.innerR, neckParams.baseH));
    p.push(new THREE.Vector2(neckParams.baseR, neckParams.baseH));
    p.push(new THREE.Vector2(neckParams.midR, neckParams.midH));
    p.push(new THREE.Vector2(neckParams.lipBottomR, neckParams.lipBottomH));
    p.push(new THREE.Vector2(neckParams.lipTopR, neckParams.lipTopH));
    p.push(new THREE.Vector2(neckParams.innerR, neckParams.lipTopH));
    p.push(new THREE.Vector2(neckParams.innerR, neckParams.lipTopH - neckParams.innerDropH));
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#111111", roughness: 1.0, metalness: 0.0 }),
    [],
  );

  if (!textures.colorMap) return null;

  const chassis = (
    <meshStandardMaterial
      color={color}
      map={textures.colorMap ?? undefined}
      bumpMap={textures.bumpMap ?? undefined}
      bumpScale={0.005}
      roughness={1.0}
      metalness={metalness}
      envMapIntensity={0.0}
    />
  );

  return (
    <group
      ref={bodyRef}
      position={[0, -0.3, 0]}
      onPointerDown={(e) => {
        e.stopPropagation();
        isLovedRef.current = true;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => (isLovedRef.current = false), 2000);
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "auto")}
    >
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[0.43, 64, 64, 0, Math.PI * 2, Math.PI * 0.15, Math.PI * 0.85]} />
        {chassis}
      </mesh>

      <mesh position={[0, bodyParams.bodyBevelY, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <torusGeometry args={[bodyParams.bodyBevelR, bodyParams.bodyBevelT, 32, 64]} />
        {chassis}
      </mesh>

      <mesh position={[0, 0.38, 0]} receiveShadow castShadow>
        <latheGeometry args={[neckProfile, 64]} />
        {chassis}
      </mesh>

      <group ref={headRef} position={[0, 0.6, 0]}>
        <mesh material={headMat} castShadow receiveShadow>
          <sphereGeometry args={[0.28, 64, 64, 0, Math.PI * 2, 0, Math.PI]} />
        </mesh>

        <GlassCapsule color={screenColor} power={3.8} intensity={screenGlow} />

        <group position={[0, -0.02, 0.29]}>
          <RobotEye position={[-0.07, 0, 0]} rotation={[0, -0.2, 0]} scale={1.1} blinkDuration={0.45} blinkCycle={blinkCycle} isLovedRef={isLovedRef} />
          <RobotEye position={[0.07, 0, 0]} rotation={[0, 0.2, 0]} scale={1.1} blinkDuration={0.45} blinkCycle={blinkCycle} isLovedRef={isLovedRef} />
        </group>

        <RobotEar position={[-0.29, 0, 0]} isLeft scale={1.3} />
        <RobotEar position={[0.29, 0, 0]} scale={1.3} />
      </group>
    </group>
  );
}

export interface RobotHeroProps {
  backgroundText?: string;
  color?: string;
  scale?: number;
  screenColor?: string;
  screenGlow?: number;
  blinkCycle?: number;
  metalness?: number;
  children?: React.ReactNode;
}

export function RobotHero({
  backgroundText = "CALCMATE",
  color = "#c4c4c4",
  scale = 1,
  screenColor = "#00c9a7",
  screenGlow = 1.2,
  blinkCycle = 3.0,
  metalness = 0.0,
  children,
}: RobotHeroProps) {
  return (
    <section
      className="relative w-full h-dvh min-h-[600px] overflow-hidden"
      style={{ background: "linear-gradient(to bottom, #cecbcb 0%, #cecbcb 55%, #9a9a9a 65%, #bebebe 100%)" }}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0">
        <h1
          className="font-sans font-black select-none whitespace-nowrap"
          style={{
            color: "#000000",
            opacity: 0.13,
            letterSpacing: "-0.05em",
            fontSize: "clamp(3rem, 13vw, 12rem)",
            lineHeight: 1,
            transform: "translate(0px, 40px)",
          }}
        >
          {backgroundText}
        </h1>
      </div>

      <div className="absolute inset-0 z-10">
        <Canvas shadows camera={{ position: [0, 0.2, 6], fov: 40 }}>
          {/* Lit with real lights rather than <Environment preset="studio">:
              that component fetches an HDR from a CDN and suspends the whole
              canvas when the asset can't be reached, leaving a blank scene.
              Three lights give the same soft studio look with no network. */}
          <ambientLight intensity={1.1} color="#ffffff" />
          <directionalLight
            position={[2.5, 5, 4]}
            intensity={1.6}
            color="#ffffff"
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0005}
          >
            <orthographicCamera attach="shadow-camera" args={[-2, 2, 2, -2, 0.1, 20]} />
          </directionalLight>
          <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#dfe9ff" />
          <pointLight position={[0, 1.2, 2.5]} intensity={0.6} color="#ffffff" />
          <ResponsiveGroup scale={scale}>
            <ContactShadows position={[0, -0.79, 0]} opacity={0.85} scale={15} resolution={1024} blur={1.7} far={2.5} color="#000000" />
            <RobotPrototype color={color} screenColor={screenColor} screenGlow={screenGlow} blinkCycle={blinkCycle} metalness={metalness} />
          </ResponsiveGroup>
        </Canvas>
      </div>

      {children ? <div className="absolute inset-0 z-20 pointer-events-none">{children}</div> : null}
    </section>
  );
}

export default RobotHero;
