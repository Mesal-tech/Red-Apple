import React, { useCallback, useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { GLView } from 'expo-gl';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import * as THREE from 'three';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const smoothMin = (a, b, width) => {
  const blend = Math.max(width - Math.abs(a - b), 0) / width;
  return Math.min(a, b) - blend * blend * width * 0.25;
};

function ellipsoidDistance(point, center, radius) {
  const x = (point[0] - center[0]) / radius[0];
  const y = (point[1] - center[1]) / radius[1];
  const z = (point[2] - center[2]) / radius[2];
  const k0 = Math.sqrt(x * x + y * y + z * z);
  const k1 = Math.sqrt(
    (x / radius[0]) ** 2 + (y / radius[1]) ** 2 + (z / radius[2]) ** 2,
  );
  return k1 === 0 ? -Math.min(...radius) : (k0 * (k0 - 1)) / k1;
}

function capsuleDistance(point, start, end, radius) {
  const axis = end.map((value, i) => value - start[i]);
  const relative = point.map((value, i) => value - start[i]);
  const axisLength = axis.reduce((sum, value) => sum + value * value, 0) || 1;
  const projection = Math.max(0, Math.min(1, relative.reduce((sum, value, i) => sum + value * axis[i], 0) / axisLength));
  const dx = relative[0] - axis[0] * projection;
  const dy = relative[1] - axis[1] * projection;
  const dz = relative[2] - axis[2] * projection;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - radius;
}

const fetalSurfaceCache = new Map();

function makeFetalSurface(stage, week) {
  const shapes = [];
  const addEllipsoid = (center, radius, blend = 0.12) => shapes.push((point) => ellipsoidDistance(point, center, radius), blend);
  const addCapsule = (start, end, radius, blend = 0.1) => shapes.push((point) => capsuleDistance(point, start, end, radius), blend);

  if (stage === 'embryonic') {
    // A single curled body and cranial end: early weeks do not yet have fetal limbs or a face.
    addEllipsoid([0.15, 0.42, 0], [0.28, 0.3, 0.23], 0.17);
    addCapsule([0.04, 0.24, 0], [-0.17, -0.18, 0], 0.19, 0.19);
    addCapsule([-0.17, -0.18, 0], [0.08, -0.43, 0], 0.15, 0.17);
    if (week >= 6) {
      addCapsule([-0.18, 0.05, 0.02], [-0.34, -0.02, 0.03], 0.07, 0.09);
      addCapsule([0.17, 0.07, 0.02], [0.32, 0.02, 0.03], 0.07, 0.09);
    }
  } else {
    const headScale = stage === 'early' ? 1.04 : stage === 'mid' ? 0.91 : 0.82;
    const bodyScale = stage === 'late' ? 1.12 : 1;
    addEllipsoid([0.25, 0.48, 0], [0.3 * headScale, 0.33 * headScale, 0.26 * headScale], 0.16);
    addEllipsoid([-0.04, -0.08, 0], [0.29 * bodyScale, 0.52 * bodyScale, 0.25 * bodyScale], 0.16);
    addEllipsoid([-0.1, -0.43, 0], [0.25 * bodyScale, 0.29 * bodyScale, 0.24 * bodyScale], 0.16);
    const armRadius = stage === 'early' ? 0.075 : 0.09;
    const legRadius = stage === 'early' ? 0.095 : 0.13;
    // Arms fold across the chest; thighs curl up and lower legs return toward the abdomen.
    addCapsule([-0.23, 0.12, 0.03], [-0.35, 0.25, 0.08], armRadius);
    addCapsule([-0.35, 0.25, 0.08], [-0.12, 0.35, 0.16], armRadius * 0.82);
    addCapsule([-0.12, 0.35, 0.16], [0.12, 0.38, 0.19], armRadius * 0.72);
    addCapsule([0.19, 0.11, 0.02], [0.36, 0.23, 0.08], armRadius);
    addCapsule([0.36, 0.23, 0.08], [0.24, 0.4, 0.16], armRadius * 0.82);
    addCapsule([0.24, 0.4, 0.16], [0.14, 0.42, 0.2], armRadius * 0.72);
    addCapsule([-0.12, -0.42, 0.02], [-0.36, -0.16, 0.08], legRadius);
    addCapsule([-0.36, -0.16, 0.08], [-0.15, 0.04, 0.14], legRadius * 0.84);
    addCapsule([-0.15, 0.04, 0.14], [0.04, -0.02, 0.16], legRadius * 0.72);
    addCapsule([0.1, -0.42, 0.02], [0.38, -0.16, 0.08], legRadius);
    addCapsule([0.38, -0.16, 0.08], [0.2, 0.05, 0.14], legRadius * 0.84);
    addCapsule([0.2, 0.05, 0.14], [0.05, 0, 0.16], legRadius * 0.72);
  }

  const evaluate = (point) => {
    let distance = 10;
    for (let i = 0; i < shapes.length; i += 2) distance = smoothMin(distance, shapes[i](point), shapes[i + 1]);
    return distance;
  };

  // Polygonize a smooth signed-distance surface with marching tetrahedra. This fuses
  // head, torso and curled limbs into one continuous mesh instead of separate blobs.
  const min = [-0.78, -0.82, -0.44];
  const step = 0.065;
  const count = min.map((value, i) => Math.ceil(([1.02, 0.95, 0.46][i] - value) / step));
  const values = new Float32Array((count[0] + 1) * (count[1] + 1) * (count[2] + 1));
  const indexAt = (x, y, z) => (x * (count[1] + 1) + y) * (count[2] + 1) + z;
  for (let x = 0; x <= count[0]; x += 1) {
    for (let y = 0; y <= count[1]; y += 1) {
      for (let z = 0; z <= count[2]; z += 1) {
        values[indexAt(x, y, z)] = evaluate([min[0] + x * step, min[1] + y * step, min[2] + z * step]);
      }
    }
  }

  const cubeCorners = [[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
  const tetrahedra = [[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
  const positions = [];
  const indices = [];
  const vertexMap = new Map();
  const vertexFor = (point) => {
    const key = `${point[0].toFixed(4)},${point[1].toFixed(4)},${point[2].toFixed(4)}`;
    if (vertexMap.has(key)) return vertexMap.get(key);
    const index = positions.length / 3;
    positions.push(point[0], point[1], point[2]);
    vertexMap.set(key, index);
    return index;
  };
  const interpolate = (a, b, va, vb) => {
    const amount = va / (va - vb);
    return a.map((value, i) => value + (b[i] - value) * amount);
  };
  const emit = (points) => indices.push(...points.map(vertexFor));
  const emitOutward = (triangle, insidePoints, outsidePoints) => {
    const normal = new THREE.Vector3().subVectors(
      new THREE.Vector3(...triangle[1]),
      new THREE.Vector3(...triangle[0]),
    ).cross(new THREE.Vector3().subVectors(
      new THREE.Vector3(...triangle[2]),
      new THREE.Vector3(...triangle[0]),
    ));
    const center = (items) => items.reduce((sum, point) => sum.add(new THREE.Vector3(...point)), new THREE.Vector3()).multiplyScalar(1 / items.length);
    const outward = center(outsidePoints).sub(center(insidePoints));
    if (normal.dot(outward) < 0) [triangle[1], triangle[2]] = [triangle[2], triangle[1]];
    emit(triangle);
  };

  for (let x = 0; x < count[0]; x += 1) {
    for (let y = 0; y < count[1]; y += 1) {
      for (let z = 0; z < count[2]; z += 1) {
        const points = cubeCorners.map(([dx, dy, dz]) => [min[0] + (x + dx) * step, min[1] + (y + dy) * step, min[2] + (z + dz) * step]);
        const field = cubeCorners.map(([dx, dy, dz]) => values[indexAt(x + dx, y + dy, z + dz)]);
        if (field.every((value) => value >= 0) || field.every((value) => value < 0)) continue;
        for (const tetra of tetrahedra) {
          const inside = tetra.filter((corner) => field[corner] < 0);
          const outside = tetra.filter((corner) => field[corner] >= 0);
          if (inside.length === 0 || inside.length === 4) continue;
          const crossing = (a, b) => interpolate(points[a], points[b], field[a], field[b]);
          const insidePoints = inside.map((corner) => points[corner]);
          const outsidePoints = outside.map((corner) => points[corner]);
          if (inside.length === 1) {
            emitOutward([crossing(inside[0], outside[0]), crossing(inside[0], outside[1]), crossing(inside[0], outside[2])], insidePoints, outsidePoints);
          } else if (inside.length === 3) {
            emitOutward([crossing(outside[0], inside[0]), crossing(outside[0], inside[2]), crossing(outside[0], inside[1])], insidePoints, outsidePoints);
          } else {
            const a = crossing(inside[0], outside[0]);
            const b = crossing(inside[0], outside[1]);
            const c = crossing(inside[1], outside[0]);
            const d = crossing(inside[1], outside[1]);
            emitOutward([a, b, c], insidePoints, outsidePoints);
            emitOutward([b, d, c], insidePoints, outsidePoints);
          }
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function buildFetus(week) {
  const stage = week <= 8 ? 'embryonic' : week <= 13 ? 'early' : week <= 27 ? 'mid' : 'late';
  const factor = stage === 'embryonic'
    ? 0.76 + week * 0.021
    : stage === 'early'
      ? 0.95 + (week - 9) * 0.012
      : stage === 'mid'
        ? 1 + (week - 14) * 0.003
        : 1.04 + (week - 28) * 0.002;
  const group = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: '#E8A486', roughness: 0.69, metalness: 0 });
  const shadedSkin = new THREE.MeshStandardMaterial({ color: '#C97E70', roughness: 0.74, metalness: 0 });
  const eyeMaterial = new THREE.MeshStandardMaterial({ color: '#704D4A', roughness: 0.58, metalness: 0 });
  const surfaceKey = `${stage}-${stage === 'embryonic' ? (week >= 6 ? 'with-buds' : 'without-buds') : 'base'}`;
  if (!fetalSurfaceCache.has(surfaceKey)) fetalSurfaceCache.set(surfaceKey, makeFetalSurface(stage, week));
  const surface = new THREE.Mesh(fetalSurfaceCache.get(surfaceKey), skin);
  surface.castShadow = true;
  surface.receiveShadow = true;
  group.add(surface);

  if (stage !== 'embryonic') {
    const detail = (position, scale, material) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), material);
      mesh.position.set(...position);
      mesh.scale.set(...scale);
      group.add(mesh);
    };
    // Small facial details sit flush with the joined head surface.
    detail([0.4, 0.53, 0.226], [0.045, 0.027, 0.018], week >= 27 ? eyeMaterial : shadedSkin);
    detail([0.49, 0.44, 0.18], [0.055, 0.045, 0.045], skin);
    detail([0.39, 0.35, 0.22], [0.065, 0.018, 0.014], shadedSkin);
    detail([0.02, 0.51, 0.22], [0.075, 0.09, 0.035], shadedSkin);
  }

  group.scale.setScalar(factor);
  group.rotation.z = -0.08;
  return group;
}

function FetusIllustration({ week }) {
  const early = week <= 8;
  const growth = week <= 8 ? 0.72 + week * 0.025 : week <= 13 ? 0.91 : week <= 27 ? 0.97 : 1;
  return (
    <Svg width="100%" height="100%" viewBox="0 0 220 240" preserveAspectRatio="xMidYMid meet">
      <Defs>
        <LinearGradient id="raSkin" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFD2B4" />
          <Stop offset="0.48" stopColor="#EAA184" />
          <Stop offset="1" stopColor="#C9756B" />
        </LinearGradient>
        <RadialGradient id="raLight" cx="0.32" cy="0.22" r="0.82">
          <Stop offset="0" stopColor="#FFF1D8" stopOpacity="0.9" />
          <Stop offset="1" stopColor="#E59A82" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="raShade" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#B96961" stopOpacity="0.05" />
          <Stop offset="1" stopColor="#9F514E" stopOpacity="0.5" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="111" cy="215" rx="57" ry="9" fill="#9C5360" opacity="0.14" />
      <G transform={`translate(110 122) scale(${growth}) translate(-110 -122)`}>
        {early ? (
          <>
            <Path d="M133 65 C154 80 155 104 139 120 C127 132 107 132 99 148 C92 162 104 175 118 168 C126 163 126 153 121 147 C138 153 145 171 135 184 C120 203 88 194 85 172 C81 148 104 135 119 124 C138 109 143 91 127 76 C121 70 115 70 111 74 C115 63 126 60 133 65Z" fill="url(#raSkin)" />
            <Path d="M133 65 C154 80 155 104 139 120 C127 132 107 132 99 148 C92 162 104 175 118 168 C126 163 126 153 121 147 C138 153 145 171 135 184 C120 203 88 194 85 172 C81 148 104 135 119 124 C138 109 143 91 127 76 C121 70 115 70 111 74 C115 63 126 60 133 65Z" fill="url(#raLight)" />
            <Ellipse cx="135" cy="83" rx="7" ry="5" fill="#B76B63" opacity="0.55" />
            <Path d="M95 138 C85 133 81 139 82 145 M113 129 C107 121 100 124 98 131" fill="none" stroke="#C87C70" strokeWidth="5" strokeLinecap="round" />
          </>
        ) : (
          <>
            {/* Folded legs and feet sit behind the curled torso. */}
            <Path d="M93 153 C73 145 62 154 68 169 C74 184 95 191 114 181 L137 165 L126 147Z" fill="url(#raSkin)" />
            <Path d="M122 157 C143 148 159 155 158 169 C157 183 140 190 123 181 L105 169Z" fill="url(#raSkin)" />
            <Path d="M67 165 C61 174 67 184 80 188 L94 183 L84 175Z M152 166 C163 171 163 179 153 185 L140 182 L147 174Z" fill="#D68D76" />
            <Path d="M119 92 C99 92 82 105 78 127 C73 151 87 174 108 180 C128 186 147 170 149 151 C151 132 140 108 119 92Z" fill="url(#raSkin)" />
            <Path d="M119 92 C99 92 82 105 78 127 C73 151 87 174 108 180 C128 186 147 170 149 151 C151 132 140 108 119 92Z" fill="url(#raLight)" />
            {/* Arms bend inward, with hands near the chin. */}
            <Path d="M89 112 C77 105 70 110 73 119 C76 128 90 130 100 135 L123 121 C128 117 124 111 119 113 L99 121Z" fill="#E9A184" />
            <Path d="M137 111 C151 105 158 110 155 119 C152 127 140 130 131 135 L113 122 C109 118 112 113 117 114 L135 122Z" fill="#D88F79" />
            <Path d="M120 93 C105 82 101 65 108 49 C115 32 133 25 149 32 C166 39 174 54 169 69 C167 76 171 80 179 85 C184 89 179 94 173 96 C171 103 165 108 156 108 C143 108 136 100 129 94Z" fill="url(#raSkin)" />
            <Path d="M120 93 C105 82 101 65 108 49 C115 32 133 25 149 32 C166 39 174 54 169 69 C167 76 171 80 179 85 C184 89 179 94 173 96 C171 103 165 108 156 108 C143 108 136 100 129 94Z" fill="url(#raLight)" />
            <Path d="M159 76 C164 78 168 81 173 85 C177 89 173 91 168 92 M160 100 C165 101 169 100 172 97" fill="none" stroke="#B96E63" strokeWidth="2" strokeLinecap="round" />
            <Ellipse cx="132" cy="56" rx="5.5" ry="3" fill="#98635B" opacity={week > 26 ? 0.82 : 0.42} />
            <Ellipse cx="113" cy="62" rx="9" ry="12" fill="#D78D76" />
            <Ellipse cx="113" cy="62" rx="4" ry="7" fill="#B96E63" opacity="0.55" />
            <Path d="M118 123 C124 119 130 115 136 116 M87 131 C92 128 96 130 101 134" fill="none" stroke="url(#raShade)" strokeWidth="4" strokeLinecap="round" />
            <Circle cx="83" cy="147" r="4" fill="#F5B698" opacity="0.55" />
          </>
        )}
      </G>
    </Svg>
  );
}

export default function PregnancyFetus3D({ week = 16, style, testID }) {
  const safeWeek = clamp(Number(week) || 1, 1, 40);
  const animationRef = useRef(null);
  const rendererRef = useRef(null);
  const onContextCreate = useCallback((gl) => {
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    // React Native has no browser document/canvas. Give Three.js the canvas-shaped
    // object it needs while directing all rendering to Expo's GL context.
    const nativeCanvas = {
      width,
      height,
      clientWidth: width,
      clientHeight: height,
      style: {},
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    const renderer = new THREE.WebGLRenderer({ canvas: nativeCanvas, context: gl, antialias: true, alpha: true });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
    camera.position.set(0, 0, 5.2);
    scene.add(new THREE.HemisphereLight(0xfff5ef, 0x9f5862, 2.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.7);
    key.position.set(-3, 4, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffb3a0, 1.1);
    fill.position.set(3, -2, 2);
    scene.add(fill);
    const fetus = buildFetus(safeWeek);
    scene.add(fetus);

    let frame = 0;
    const draw = () => {
      fetus.rotation.y = Math.sin(frame * 0.006) * 0.22;
      fetus.rotation.x = Math.sin(frame * 0.004) * 0.035;
      renderer.render(scene, camera);
      gl.endFrameEXP();
      frame += 1;
      animationRef.current = requestAnimationFrame(draw);
    };
    draw();
  }, [safeWeek]);
  useEffect(() => () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    rendererRef.current?.dispose();
  }, []);

  return (
    <View style={[styles.container, style]} testID={testID} accessibilityLabel={`Illustrative three dimensional ${safeWeek}-week ${safeWeek <= 8 ? 'embryo' : 'fetus'} model`}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <FetusIllustration week={safeWeek} />
      </View>
      {Platform.OS !== 'web' && (
        <GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
