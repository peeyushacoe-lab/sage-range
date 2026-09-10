"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { useRouter } from "next/navigation";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import * as THREE from "three";
import { ENVIRONMENTS, ROOM_BOUNDS, type PlacedObject } from "./room-layout";

type SessionState = {
  sessionId: string;
  status: "IN_PROGRESS" | "SUBMITTED";
  scenario: { slug: string; title: string; briefing: string; objective: string; environment: string };
  objects: { key: string; kind: string }[];
  found: string[];
};

type FoundEntry = { key: string; label: string; description: string; kind: string };

const INTERACT_DISTANCE = 2.4;

export function InvestigationScene({
  sessionId,
  title,
  objective,
  environment,
}: {
  sessionId: string;
  title: string;
  objective: string;
  environment: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<SessionState | null>(null);
  const [locked, setLocked] = useState(false);
  const [nearestKey, setNearestKey] = useState<string | null>(null);
  const [foundLog, setFoundLog] = useState<Record<string, FoundEntry>>({});
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<FoundEntry | null>(null);
  const [pending, setPending] = useState(false);

  // Load session state, then backfill descriptions for anything already
  // found in a previous visit — /evidence is idempotent for an already-found
  // key, so this is just re-reading what this player already legitimately
  // unlocked, not a new leak.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/missions/session/${sessionId}/state`);
      if (!res.ok) return;
      const data: SessionState = await res.json();
      if (cancelled) return;
      setState(data);
      for (const key of data.found) {
        const r = await fetch(`/api/missions/session/${sessionId}/evidence`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        });
        if (!r.ok || cancelled) continue;
        const body = await r.json();
        setFoundLog((prev) => ({ ...prev, [key]: { key, label: body.label, description: body.description, kind: body.kind } }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const objects = useMemo<PlacedObject[]>(() => {
    if (!state) return [];
    const layout = ENVIRONMENTS[environment]?.objects ?? [];
    const known = new Set(state.objects.map((o) => o.key));
    return layout.filter((o) => known.has(o.key));
  }, [state, environment]);

  const examine = useCallback(
    async (key: string) => {
      if (pending) return;
      setPending(true);
      try {
        const res = await fetch(`/api/missions/session/${sessionId}/evidence`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        });
        if (!res.ok) return;
        const body = await res.json();
        const entry: FoundEntry = { key, label: body.label, description: body.description, kind: body.kind };
        setFoundLog((prev) => ({ ...prev, [key]: entry }));
        setActivePanel(entry);
      } finally {
        setPending(false);
      }
    },
    [sessionId, pending],
  );

  // Global E / Tab handling — E acts on whatever's currently nearest, Tab
  // toggles the notebook. Suppressed while a result panel is open so "E" to
  // dismiss it (see panel below) doesn't also trigger a re-examine.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === "Tab") {
        e.preventDefault();
        setNotebookOpen((v) => !v);
      } else if (e.code === "KeyE" && !activePanel && nearestKey) {
        examine(nearestKey);
      } else if (e.code === "Escape" && activePanel) {
        setActivePanel(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nearestKey, examine, activePanel]);

  if (!state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-500">
        Loading scene…
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black text-white">
      <Canvas camera={{ fov: 75, position: [0, 1.6, 0] }} shadows={false}>
        <Room
          objects={objects}
          onNearest={setNearestKey}
          locked={locked}
          onLockChange={setLocked}
          paused={!!activePanel || notebookOpen}
        />
      </Canvas>

      {/* Crosshair */}
      {locked && !activePanel && !notebookOpen && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70" />
      )}

      {/* Interact prompt */}
      {locked && nearestKey && !activePanel && !notebookOpen && (
        <div className="pointer-events-none absolute left-1/2 top-[58%] -translate-x-1/2 rounded-md bg-black/70 px-3 py-1.5 text-xs font-medium text-white">
          <kbd className="mr-1.5 rounded bg-white/15 px-1.5 py-0.5 font-mono">E</kbd> Examine
        </div>
      )}

      {/* HUD */}
      <div className="pointer-events-none absolute left-4 top-4 max-w-sm">
        <p className="text-[10px] uppercase tracking-widest text-zinc-500">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">{objective}</p>
      </div>
      <div className="pointer-events-none absolute right-4 top-4 text-right text-[10px] uppercase tracking-widest text-zinc-600">
        {Object.keys(foundLog).length}/{objects.length} found · <kbd className="rounded bg-white/10 px-1 py-0.5 font-mono normal-case">Tab</kbd> notebook
      </div>

      {/* Click-to-start overlay */}
      {!locked && !activePanel && !notebookOpen && (
        <StartOverlay onStart={() => setLocked(true)} />
      )}

      {/* Evidence result panel */}
      {activePanel && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-950 p-6">
            <p className="mb-1 text-[10px] uppercase tracking-widest text-emerald-400">
              {activePanel.kind === "DIGITAL" ? "Digital evidence" : "Physical evidence"}
            </p>
            <h3 className="mb-3 text-lg font-bold text-zinc-100">{activePanel.label}</h3>
            <p className="text-sm leading-relaxed text-zinc-400">{activePanel.description}</p>
            <button
              className="mt-5 w-full rounded-lg bg-white/10 py-2 text-sm font-semibold text-white hover:bg-white/15"
              onClick={() => setActivePanel(null)}
            >
              Continue investigating (Esc)
            </button>
          </div>
        </div>
      )}

      {/* Investigator notebook */}
      {notebookOpen && !activePanel && (
        <div className="absolute inset-y-0 right-0 w-full max-w-sm overflow-y-auto border-l border-white/10 bg-zinc-950/95 p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Investigator notebook</p>
            <button className="text-xs text-zinc-500 hover:text-zinc-300" onClick={() => setNotebookOpen(false)}>
              Close (Tab)
            </button>
          </div>
          {Object.keys(foundLog).length === 0 ? (
            <p className="text-sm text-zinc-600">Nothing logged yet. Go find something.</p>
          ) : (
            <ul className="space-y-3">
              {Object.values(foundLog).map((e) => (
                <li key={e.key} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <p className="text-[9px] uppercase tracking-widest text-zinc-600">{e.kind}</p>
                  <p className="mt-0.5 text-sm font-semibold text-zinc-200">{e.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">{e.description}</p>
                </li>
              ))}
            </ul>
          )}
          <button
            className="mt-6 w-full rounded-lg border border-white/10 py-2 text-xs text-zinc-400 hover:bg-white/5"
            onClick={() => router.push("/missionanalyst")}
          >
            Exit to briefing
          </button>
        </div>
      )}
    </div>
  );
}

function StartOverlay({ onStart }: { onStart: () => void }) {
  return (
    <div
      className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-3 bg-black/80"
      onClick={onStart}
    >
      <p className="text-sm font-semibold text-zinc-200">Click to enter the scene</p>
      <p className="text-xs text-zinc-500">Mouse to look · WASD to move · E to examine · Tab for notebook</p>
    </div>
  );
}

/** Everything inside the Canvas: lighting, room geometry, controls, objects. */
function Room({
  objects,
  onNearest,
  locked,
  onLockChange,
  paused,
}: {
  objects: PlacedObject[];
  onNearest: (key: string | null) => void;
  locked: boolean;
  onLockChange: (locked: boolean) => void;
  paused: boolean;
}) {
  const controlsRef = useRef<InstanceType<typeof import("three-stdlib").PointerLockControls> | null>(null);
  const keys = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const down = (e: KeyboardEvent) => (keys.current[e.code] = true);
    const up = (e: KeyboardEvent) => (keys.current[e.code] = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    const c = controlsRef.current;
    if (!c) return;
    if (locked && !paused) c.lock?.();
    else c.unlock?.();
  }, [locked, paused]);

  return (
    <>
      <ambientLight intensity={0.55} />
      <pointLight position={[0, 3.5, 0]} intensity={25} distance={20} decay={2} />
      <pointLight position={[-5, 3, -3]} intensity={12} distance={12} decay={2} />
      <pointLight position={[4, 3, 3]} intensity={12} distance={12} decay={2} />

      <PointerLockControls
        ref={controlsRef}
        onUnlock={() => onLockChange(false)}
      />
      <MovementRig keysRef={keys} paused={paused || !locked} />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[16, 12]} />
        <meshStandardMaterial color="#1c1d22" />
      </mesh>

      {/* Walls */}
      <Wall position={[0, 2, -5.5]} size={[16, 4, 0.3]} />
      <Wall position={[0, 2, 5.5]} size={[16, 4, 0.3]} />
      <Wall position={[-7.85, 2, 0]} size={[0.3, 4, 12]} />
      <Wall position={[7.85, 2, 0]} size={[0.3, 4, 12]} />

      {/* Desks (dressing, non-interactive) */}
      <Desk position={[-5, 0, -3.2]} />
      <Desk position={[3, 0, 3.2]} />
      <Desk position={[-2, 0, 2.4]} />

      {objects.map((o) => (
        <EvidenceObject key={o.key} object={o} />
      ))}

      <ProximityTracker objects={objects} onNearest={onNearest} />
    </>
  );
}

function Wall({ position, size }: { position: [number, number, number]; size: [number, number, number] }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#2a2c33" />
    </mesh>
  );
}

function Desk({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={[position[0], 0.5, position[2]]}>
      <boxGeometry args={[1.6, 1, 0.8]} />
      <meshStandardMaterial color="#3a2f27" />
    </mesh>
  );
}

function EvidenceObject({ object }: { object: PlacedObject }) {
  const { position, appearance } = object;
  if (appearance === "screen") {
    return (
      <mesh position={position}>
        <boxGeometry args={[0.5, 0.35, 0.05]} />
        <meshStandardMaterial color="#2f6fed" emissive="#1a3a80" emissiveIntensity={0.6} />
      </mesh>
    );
  }
  if (appearance === "note") {
    return (
      <mesh position={position} rotation={[-0.3, 0, 0]}>
        <planeGeometry args={[0.25, 0.25]} />
        <meshStandardMaterial color="#e8d24a" side={THREE.DoubleSide} />
      </mesh>
    );
  }
  if (appearance === "plant") {
    return (
      <group position={position}>
        <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.2, 0.25, 0.4, 8]} />
          <meshStandardMaterial color="#5a4535" />
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <coneGeometry args={[0.3, 0.6, 8]} />
          <meshStandardMaterial color="#3f7a4a" />
        </mesh>
      </group>
    );
  }
  // "small" — a compact prop like a USB drive
  return (
    <mesh position={position}>
      <boxGeometry args={[0.12, 0.08, 0.25]} />
      <meshStandardMaterial color="#c4c8cf" metalness={0.4} roughness={0.5} />
    </mesh>
  );
}

/** WASD movement relative to camera yaw, clamped to the room bounds. */
function MovementRig({ keysRef, paused }: { keysRef: MutableRefObject<Record<string, boolean>>; paused: boolean }) {
  const { camera } = useThree();
  const SPEED = 3.4;

  useFrame((_, delta) => {
    if (paused) return;
    const k = keysRef.current;
    const forward = (k["KeyW"] ? 1 : 0) - (k["KeyS"] ? 1 : 0);
    const strafe = (k["KeyD"] ? 1 : 0) - (k["KeyA"] ? 1 : 0);
    if (!forward && !strafe) return;

    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();
    const right = new THREE.Vector3().crossVectors(dir, camera.up).normalize();

    const move = new THREE.Vector3();
    move.addScaledVector(dir, forward);
    move.addScaledVector(right, strafe);
    if (move.lengthSq() > 0) move.normalize().multiplyScalar(SPEED * delta);

    camera.position.add(move);
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, ROOM_BOUNDS.minX, ROOM_BOUNDS.maxX);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, ROOM_BOUNDS.minZ, ROOM_BOUNDS.maxZ);
    camera.position.y = 1.6;
  });

  return null;
}

/** Finds the closest interactable within range each frame, without a raycast — proximity is enough for V1. */
function ProximityTracker({ objects, onNearest }: { objects: PlacedObject[]; onNearest: (key: string | null) => void }) {
  const { camera } = useThree();
  const last = useRef<string | null>(null);

  useFrame(() => {
    let closest: string | null = null;
    let closestDist = INTERACT_DISTANCE;
    for (const o of objects) {
      const d = camera.position.distanceTo(new THREE.Vector3(...o.position));
      if (d < closestDist) {
        closestDist = d;
        closest = o.key;
      }
    }
    if (closest !== last.current) {
      last.current = closest;
      onNearest(closest);
    }
  });

  return null;
}
