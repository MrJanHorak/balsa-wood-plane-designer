'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GliderAeroReport, GliderDesign } from '@/types/glider';
import {
  createBalsaWoodTexture,
  createBallastMesh,
  createFinMesh,
  createFuselageMesh,
  createTailMesh,
  createWingMesh,
} from '@/geometry/extrusion3d';
import { AeroGizmos3D } from './AeroGizmos3d';
import { Eye, RotateCcw, Grid, Crosshair, Box } from 'lucide-react';

interface Glider3DViewportProps {
  glider: GliderDesign;
  aeroReport: GliderAeroReport;
}

export const Glider3DViewport: React.FC<Glider3DViewportProps> = ({ glider, aeroReport }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  const modelGroupRef = useRef<THREE.Group | null>(null);
  const gizmosRef = useRef<AeroGizmos3D | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const balsaMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);

  const [showGizmos, setShowGizmos] = useState(true);
  const [showAeroCenters, setShowAeroCenters] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [isWireframe, setIsWireframe] = useState(false);
  const [currentView, setCurrentView] = useState<'perspective' | 'top' | 'side' | 'front'>('perspective');

  // Set Camera Preset View
  const setCameraView = useCallback((view: 'perspective' | 'top' | 'side' | 'front') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const cg = new THREE.Vector3(aeroReport.cgXMm, aeroReport.cgYMm, 0);

    controls.target.copy(cg);
    const dist = Math.max(glider.wing.spanMm, glider.fuselage.lengthMm) * 1.3;

    if (view === 'perspective') {
      camera.position.set(cg.x - dist * 0.7, cg.y + dist * 0.5, dist * 0.8);
    } else if (view === 'top') {
      camera.position.set(cg.x, cg.y + dist * 1.4, 0.01);
    } else if (view === 'side') {
      camera.position.set(cg.x, cg.y, dist * 1.2);
    } else if (view === 'front') {
      camera.position.set(cg.x - dist * 1.3, cg.y, 0);
    }

    camera.lookAt(cg);
    controls.update();
    setCurrentView(view);
  }, [aeroReport.cgXMm, aeroReport.cgYMm, glider.wing.spanMm, glider.fuselage.lengthMm]);

  // Initialize Three.js Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Slate-900 aerospace background
    sceneRef.current = scene;

    // Camera
    const width = container.clientWidth;
    const height = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000);
    camera.position.set(-150, 180, 260);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 1500;
    controls.minDistance = 30;
    controls.target.set(100, 20, 0);
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xfffaed, 1.6);
    dirLight1.position.set(200, 350, 250);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 2048;
    dirLight1.shadow.mapSize.height = 2048;
    dirLight1.shadow.camera.near = 10;
    dirLight1.shadow.camera.far = 1200;
    dirLight1.shadow.camera.left = -300;
    dirLight1.shadow.camera.right = 300;
    dirLight1.shadow.camera.top = 300;
    dirLight1.shadow.camera.bottom = -300;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x94a3b8, 0.6);
    dirLight2.position.set(-200, -100, -200);
    scene.add(dirLight2);

    // Grid Floor
    const grid = new THREE.GridHelper(600, 60, 0x334155, 0x1e293b);
    grid.position.set(120, -10, 0);
    scene.add(grid);
    gridHelperRef.current = grid;

    // Balsa Material with Procedural Wood Grain
    const woodTexture = createBalsaWoodTexture();
    const balsaMat = new THREE.MeshStandardMaterial({
      map: woodTexture,
      roughness: 0.7,
      metalness: 0.05,
      color: 0xf5dfb8,
      side: THREE.DoubleSide,
    });
    balsaMaterialRef.current = balsaMat;

    // Root Glider Mesh Group
    const modelGroup = new THREE.Group();
    modelGroup.name = 'assembled_glider';
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    // Aero Gizmos
    const gizmos = new AeroGizmos3D();
    scene.add(gizmos.rootGroup);
    gizmosRef.current = gizmos;

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      woodTexture.dispose();
      balsaMat.dispose();
    };
  }, []);

  // Update Glider Model Geometry on Parameter Change
  useEffect(() => {
    const modelGroup = modelGroupRef.current;
    const balsaMat = balsaMaterialRef.current;
    if (!modelGroup || !balsaMat) return;

    // Update wireframe property
    balsaMat.wireframe = isWireframe;

    // Clear previous glider parts
    while (modelGroup.children.length > 0) {
      const child = modelGroup.children[0];
      modelGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
      } else if (child instanceof THREE.Group) {
        child.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry?.dispose();
          }
        });
      }
    }

    // Build assembled glider meshes
    const fuselageMesh = createFuselageMesh(glider, balsaMat);
    const wingMesh = createWingMesh(glider, balsaMat);
    const tailMesh = createTailMesh(glider, balsaMat);
    const finMesh = createFinMesh(glider, balsaMat);
    const ballastMesh = createBallastMesh(glider);

    modelGroup.add(fuselageMesh);
    modelGroup.add(wingMesh);
    modelGroup.add(tailMesh);
    modelGroup.add(finMesh);
    modelGroup.add(ballastMesh);

    // Update Gizmos
    if (gizmosRef.current) {
      gizmosRef.current.rootGroup.visible = showGizmos;
      gizmosRef.current.update(aeroReport, showAeroCenters);
    }
  }, [glider, aeroReport, isWireframe, showGizmos, showAeroCenters]);

  // Update Grid Visibility
  useEffect(() => {
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = showGrid;
    }
  }, [showGrid]);

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 overflow-hidden select-none">
      {/* 3D Canvas Mount */}
      <div ref={containerRef} className="w-full flex-1 cursor-grab active:cursor-grabbing" />

      {/* Top Floating Control Bar */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        {/* Camera Views Preset Toolbar */}
        <div className="flex items-center gap-1 bg-slate-900/85 backdrop-blur-md p-1.5 rounded-lg border border-slate-700/60 shadow-lg pointer-events-auto">
          <button
            onClick={() => setCameraView('perspective')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              currentView === 'perspective'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Perspective
          </button>
          <button
            onClick={() => setCameraView('top')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              currentView === 'top'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Top (Planform)
          </button>
          <button
            onClick={() => setCameraView('side')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              currentView === 'side'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Side (Profile)
          </button>
          <button
            onClick={() => setCameraView('front')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              currentView === 'front'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Front (Dihedral)
          </button>
        </div>

        {/* Viewport Display Toggles */}
        <div className="flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md p-1.5 rounded-lg border border-slate-700/60 shadow-lg pointer-events-auto">
          <button
            onClick={() => setShowGizmos(!showGizmos)}
            title="Toggle CG & Neutral Point Gizmos"
            className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
              showGizmos ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CG/NP</span>
          </button>

          <button
            onClick={() => setShowAeroCenters(!showAeroCenters)}
            title="Toggle Wing & Tail Aerodynamic Centers"
            className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
              showAeroCenters ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Aero Centers</span>
          </button>

          <button
            onClick={() => setShowGrid(!showGrid)}
            title="Toggle Ground Plane Grid"
            className={`p-1.5 rounded text-xs transition-colors ${
              showGrid ? 'bg-slate-700 text-slate-200' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsWireframe(!isWireframe)}
            title="Toggle Wireframe CAD Mode"
            className={`p-1.5 rounded text-xs transition-colors ${
              isWireframe ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setCameraView('perspective')}
            title="Reset Camera Target"
            className="p-1.5 rounded text-slate-400 hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom 3D On-Screen Legend & Balance Quick-Pill */}
      <div className="absolute bottom-3 left-3 pointer-events-none flex items-center gap-2">
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-700/60 text-xs shadow-lg">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full border border-amber-400 bg-[conic-gradient(#111827_0deg_90deg,#fbbf24_90deg_180deg,#111827_180deg_270deg,#fbbf24_270deg_360deg)] shadow-sm" />
            <span className="font-semibold text-amber-300">CG</span>
            <span className="text-slate-400">({aeroReport.cgXMm.toFixed(1)}mm)</span>
          </div>

          <div className="w-[1px] h-3.5 bg-slate-700" />

          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400 ring-2 ring-cyan-500/30" />
            <span className="font-semibold text-cyan-300">NP</span>
            <span className="text-slate-400">({aeroReport.npXMm.toFixed(1)}mm)</span>
          </div>

          <div className="w-[1px] h-3.5 bg-slate-700" />

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Static Margin:</span>
            <span
              className={`font-bold ${
                aeroReport.stabilityStatus === 'optimal'
                  ? 'text-emerald-400'
                  : aeroReport.stabilityStatus === 'tail_heavy' || aeroReport.stabilityStatus === 'critically_tail_heavy'
                  ? 'text-red-400'
                  : 'text-blue-400'
              }`}
            >
              {aeroReport.staticMarginPercent.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
