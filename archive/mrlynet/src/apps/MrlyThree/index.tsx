import { useState, useEffect, useRef, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { useTheme } from "../../contexts/ThemeContext";
import { generate3d, invert3d, toOBJ } from "../../lib/fractal";
import { mjColors as colors } from "../../lib/colors";
import { BorderBox, ListBox, LinkBox, GridBox, CardBox, InfoBox } from "../../components/System";
import { ScreenshotButton } from "../../components/ScreenshotButton";
import { MRLY_DESIGNS_3D } from "../../mrly";
import { useDesigner } from "../../hooks/useDesigner";
import { saveCanvasPng, saveBlobDownload } from "../../lib/browser/screenshot";

// CONSTANTS

const PERSPECTIVE_FOV = 45;
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 1000;
const ORTHO_FRUSTUM_DEFAULT = 20;
const ORTHO_PADDING = 2.5;
const PERSPECTIVE_DISTANCE_MULTIPLIER = 1.5;
const ORTHO_DISTANCE_MULTIPLIER = 2;
const MATERIAL_SHININESS = 500;
const MATERIAL_SPECULAR = 0x111111;
const AMBIENT_LIGHT_INTENSITY = 1;
const DIRECTIONAL_LIGHT_INTENSITY = 5;
const EDGE_COLOR = 0x000000;
const EDGE_OPACITY = 1;
const TRANSLUCENT_OPACITY = 0.25;
const DEFAULT_FILL_COLOR_INDEX = 2;

// GEOMETRY

function constructBufferGeometry(grid: number[][][], r: number, g: number, b: number) {
  const vertices: number[] = [];
  const colorBuf: number[] = [];
  const pushFace = (v1: number[], v2: number[], v3: number[], v4: number[]) => {
    vertices.push(...v1, ...v4, ...v3);
    vertices.push(...v1, ...v3, ...v2);
    for (let i = 0; i < 6; i++) colorBuf.push(r, g, b);
  };
  const d = grid.length;
  const h = grid[0].length;
  const w = grid[0][0].length;
  for (let z = 0; z < d; z++) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (grid[z][y][x] === 0) continue;
        if (x === 0 || grid[z][y][x - 1] === 0) pushFace([x, y, z], [x, y + 1, z], [x, y + 1, z + 1], [x, y, z + 1]);
        if (x === w - 1 || grid[z][y][x + 1] === 0)
          pushFace([x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x + 1, y + 1, z], [x + 1, y, z]);
        if (y === 0 || grid[z][y - 1][x] === 0) pushFace([x, y, z], [x, y, z + 1], [x + 1, y, z + 1], [x + 1, y, z]);
        if (y === h - 1 || grid[z][y + 1][x] === 0)
          pushFace([x, y + 1, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]);
        if (z === 0 || grid[z - 1][y][x] === 0) pushFace([x, y, z], [x + 1, y, z], [x + 1, y + 1, z], [x, y + 1, z]);
        if (z === d - 1 || grid[z + 1][y][x] === 0)
          pushFace([x, y, z + 1], [x, y + 1, z + 1], [x + 1, y + 1, z + 1], [x + 1, y, z + 1]);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colorBuf, 3));
  geometry.computeVertexNormals();
  return geometry;
}

// COMPONENT

export function MrlyThree() {
  const d = useDesigner({ designs: MRLY_DESIGNS_3D, dimension: 3, defaultNumberIndex: 1 });
  const [fillColorIndex, setFillColorIndex] = useState(DEFAULT_FILL_COLOR_INDEX);
  const [inverted, setInverted] = useState(false);
  const [cameraMode, setCameraMode] = useState<"perspective" | "orthographic">("orthographic");
  const [materialType, setMaterialType] = useState<"basic" | "shiny">("basic");
  const [edgeEnabled, setEdgeEnabled] = useState(true);
  const [translucent, setTranslucent] = useState(false);
  const { mode } = useTheme();
  const fillColor = colors[fillColorIndex];
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const wireframeRef = useRef<THREE.LineSegments | null>(null);
  const grid = useMemo(() => {
    const base = generate3d(d.design, d.number, d.level);
    return inverted ? invert3d(base) : base;
  }, [d.design, d.number, d.level, inverted]);

  // INIT THREE.JS

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;
    const width = containerRef.current.clientWidth;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(mode ? 0x000000 : 0xffffff);
    sceneRef.current = scene;
    let camera: THREE.Camera;
    if (cameraMode === "perspective") {
      camera = new THREE.PerspectiveCamera(PERSPECTIVE_FOV, 1, CAMERA_NEAR, CAMERA_FAR);
    } else {
      const frustumSize = ORTHO_FRUSTUM_DEFAULT;
      camera = new THREE.OrthographicCamera(
        frustumSize / -2,
        frustumSize / 2,
        frustumSize / 2,
        frustumSize / -2,
        CAMERA_NEAR,
        CAMERA_FAR
      );
    }
    cameraRef.current = camera;
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: false,
    });
    renderer.setSize(width, width);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;
    const controls = new OrbitControls(camera, canvasRef.current);
    controls.enableDamping = true;
    controlsRef.current = controls;
    const ambientLight = new THREE.AmbientLight(0xffffff, AMBIENT_LIGHT_INTENSITY);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, DIRECTIONAL_LIGHT_INTENSITY);
    dirLight.position.set(1, 1, 1);
    scene.add(dirLight);
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const size = containerRef.current.clientWidth;
      if (cameraRef.current instanceof THREE.PerspectiveCamera) cameraRef.current.aspect = 1;
      (cameraRef.current as THREE.PerspectiveCamera | THREE.OrthographicCamera).updateProjectionMatrix();
      rendererRef.current.setSize(size, size);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      controls.dispose();
    };

  }, [cameraMode]);

  useEffect(() => {
    if (sceneRef.current) sceneRef.current.background = new THREE.Color(mode ? 0x000000 : 0xffffff);
  }, [mode]);

  useEffect(() => {
    if (wireframeRef.current) wireframeRef.current.visible = edgeEnabled;
  }, [edgeEnabled]);

  // UPDATE MESH

  useEffect(() => {
    if (!sceneRef.current || !grid) return;
    if (meshRef.current) {
      sceneRef.current.remove(meshRef.current);
      meshRef.current.geometry.dispose();
      if (Array.isArray(meshRef.current.material)) meshRef.current.material.forEach((m) => m.dispose());
      else meshRef.current.material.dispose();
    }
    if (wireframeRef.current) {
      sceneRef.current.remove(wireframeRef.current);
      wireframeRef.current.geometry.dispose();
      if (Array.isArray(wireframeRef.current.material)) wireframeRef.current.material.forEach((m) => m.dispose());
      else wireframeRef.current.material.dispose();
    }
    const r = fillColor.color.r / 255;
    const g = fillColor.color.g / 255;
    const b = fillColor.color.b / 255;
    const geometry = constructBufferGeometry(grid, r, g, b);
    geometry.computeBoundingBox();
    if (geometry.boundingBox && cameraRef.current) {
      const center = geometry.boundingBox.getCenter(new THREE.Vector3());
      geometry.translate(-center.x, -center.y, -center.z);
      const size = Math.max(
        geometry.boundingBox.max.x - geometry.boundingBox.min.x,
        geometry.boundingBox.max.y - geometry.boundingBox.min.y,
        geometry.boundingBox.max.z - geometry.boundingBox.min.z
      );
      if (cameraMode === "perspective") {
        const dist = size * PERSPECTIVE_DISTANCE_MULTIPLIER;
        cameraRef.current.position.set(dist, dist, dist);
      } else {
        const cam = cameraRef.current as THREE.OrthographicCamera;
        const frustumSize = size * ORTHO_PADDING;
        cam.left = frustumSize / -2;
        cam.right = frustumSize / 2;
        cam.top = frustumSize / 2;
        cam.bottom = frustumSize / -2;
        cam.updateProjectionMatrix();
        const dist = size * ORTHO_DISTANCE_MULTIPLIER;
        cam.position.set(dist, dist, dist);
      }
      cameraRef.current.lookAt(0, 0, 0);
      controlsRef.current?.update();
    }
    let material: THREE.Material;
    if (materialType === "shiny") {
      material = new THREE.MeshPhongMaterial({
        vertexColors: true,
        shininess: MATERIAL_SHININESS,
        specular: MATERIAL_SPECULAR,
        transparent: translucent,
        opacity: translucent ? TRANSLUCENT_OPACITY : 1,
      });
    } else {
      material = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: translucent,
        opacity: translucent ? TRANSLUCENT_OPACITY : 1,
      });
    }
    const mesh = new THREE.Mesh(geometry, material);
    if (d.design === "tree") {
      mesh.rotation.z = Math.PI / 2;
    }
    sceneRef.current.add(mesh);
    meshRef.current = mesh;
    const edgesGeom = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: EDGE_COLOR, transparent: true, opacity: EDGE_OPACITY });
    const wireframe = new THREE.LineSegments(edgesGeom, lineMaterial);
    if (d.design === "tree") {
      wireframe.rotation.z = Math.PI / 2;
    }
    wireframe.visible = edgeEnabled;
    sceneRef.current.add(wireframe);
    wireframeRef.current = wireframe;
  }, [grid, fillColor, cameraMode, materialType, edgeEnabled, translucent, d.design]);

  // HANDLERS

  const handleDownloadOBJ = () => {
    if (!grid) return;
    saveBlobDownload(toOBJ(grid), "obj");
  };

  const handleScreenshot = (size: number) => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    saveCanvasPng(rendererRef.current.domElement, size);
  };

  // RENDER

  return (
    <ListBox>
      <BorderBox>
        <CardBox ref={containerRef}>
          <canvas ref={canvasRef} className="fill" style={{ display: "block" }} />
        </CardBox>
      </BorderBox>
      <BorderBox>
        <GridBox cols={3}>
          <InfoBox>grid: {d.gridCount}</InfoBox>
          <InfoBox>fill: {d.fillCount}</InfoBox>
          <InfoBox>void: {d.voidCount}</InfoBox>
        </GridBox>
      </BorderBox>
      <BorderBox>
        <GridBox cols={4}>
          <LinkBox onClick={d.cycleDesign}>{d.design}</LinkBox>
          <LinkBox onClick={d.cycleNumber}>{d.number}</LinkBox>
          <LinkBox onClick={d.cycleLevel}>{d.level}</LinkBox>
          <LinkBox onClick={d.cycleMaxUnits}>{d.maxUnitsLabel}</LinkBox>
        </GridBox>
      </BorderBox>
      <BorderBox>
        <GridBox cols={3}>
          <LinkBox onClick={() => setCameraMode((m) => (m === "perspective" ? "orthographic" : "perspective"))}>
            {cameraMode === "perspective" ? "perspective" : "orthographic"}
          </LinkBox>
          <LinkBox onClick={() => setInverted((v) => !v)}>{inverted ? "normal" : "invert"}</LinkBox>
          <LinkBox onClick={() => setFillColorIndex((i) => (i + 1) % colors.length)}>fill: {fillColor.name}</LinkBox>
        </GridBox>
      </BorderBox>
      <BorderBox>
        <GridBox cols={3}>
          <LinkBox onClick={() => setMaterialType((m) => (m === "basic" ? "shiny" : "basic"))}>
            mode: {materialType}
          </LinkBox>
          <LinkBox onClick={() => setEdgeEnabled((v) => !v)}>edge: {edgeEnabled ? "on" : "off"}</LinkBox>
          <LinkBox onClick={() => setTranslucent((v) => !v)}>alpha: {translucent ? "25" : "100"}</LinkBox>
        </GridBox>
      </BorderBox>
      <BorderBox>
        <GridBox cols={3}>
          <ScreenshotButton onSave={handleScreenshot} />
          <LinkBox onClick={handleDownloadOBJ}>OBJ</LinkBox>
        </GridBox>
      </BorderBox>
    </ListBox>
  );
}
