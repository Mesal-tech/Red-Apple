import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GLView } from 'expo-gl';
import * as THREE from 'three';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const PARTICLE_COUNT = 620;
const FALLBACK_PARTICLES = Array.from({ length: 92 }, (_, index) => {
  const angle = index * Math.PI * (3 - Math.sqrt(5));
  const radius = 8 + Math.sqrt((index + 1) / 92) * 132;
  const depth = 0.5 + 0.5 * Math.sin(index * 2.17);
  return {
    key: `p-${index}`,
    left: 160 + Math.cos(angle) * radius,
    top: 160 + Math.sin(angle) * radius * 0.82,
    size: 1.5 + depth * 3.2,
    opacity: 0.22 + depth * 0.72,
    color: index % 5 === 0 ? '#CFA9FF' : index % 7 === 0 ? '#FFFFFF' : '#5CE4E7',
  };
});

function createParticleGeometry() {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  const sizes = new Float32Array(PARTICLE_COUNT);
  const phases = new Float32Array(PARTICLE_COUNT);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let index = 0; index < PARTICLE_COUNT; index += 1) {
    const y = 1 - (index / (PARTICLE_COUNT - 1)) * 2;
    const ringRadius = Math.sqrt(1 - y * y);
    const angle = goldenAngle * index;
    const offset = index * 3;
    positions[offset] = Math.cos(angle) * ringRadius * 108;
    positions[offset + 1] = y * 108;
    positions[offset + 2] = Math.sin(angle) * ringRadius * 108;

    const color = new THREE.Color().setHSL(0.49 + (index % 29) / 290, 0.88, index % 7 === 0 ? 0.82 : 0.58);
    colors[offset] = color.r;
    colors[offset + 1] = color.g;
    colors[offset + 2] = color.b;
    sizes[index] = index % 11 === 0 ? 5 : 3.2 + (index % 5) * 0.35;
    phases[index] = (index * 1.618) % (Math.PI * 2);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aOriginalPos', new THREE.BufferAttribute(positions.slice(), 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  return geometry;
}

const vertexShader = `
  uniform float uTime;
  uniform float uEnergy;
  uniform float uActivity;
  attribute vec3 aOriginalPos;
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aPhase;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = mix(aColor, vec3(1.0), clamp(uEnergy * 0.38, 0.0, 0.38));
    vec3 pos = aOriginalPos;
    float speed = 1.8 + uActivity * 1.8;
    float pulse = 1.0 + sin(uTime * 2.2) * 0.025 + uEnergy * 0.06;
    pos.x += sin(uTime * speed + aPhase) * (1.4 + uEnergy * 3.0);
    pos.y += cos(uTime * speed * 0.9 + aPhase * 1.4) * (1.2 + uEnergy * 2.5);
    pos.z += sin(uTime * speed * 1.1 + aPhase * 0.8) * (1.6 + uEnergy * 3.2);
    float sway = sin(uTime * 0.55) * 0.2;
    float c = cos(sway);
    float s = sin(sway);
    pos.xz = mat2(c, -s, s, c) * pos.xz;
    pos *= pulse;
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = clamp(aSize * (350.0 / -mvPosition.z) * (1.0 + uEnergy * 0.65), 2.0, 18.0);
    vAlpha = 0.78 + sin(uTime * 2.7 + aPhase) * 0.12 + uActivity * 0.1;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;
    float glow = exp(-dist * dist * 12.0);
    vec3 color = dist < 0.2 ? mix(vColor, vec3(1.0), 0.65) : vColor;
    gl_FragColor = vec4(color, glow * vAlpha);
  }
`;

export default function ParticleOrb({ phase = 'idle', audioLevel = 0, visible = true }) {
  const [rendererError, setRendererError] = useState(false);
  const valuesRef = useRef({ phase, audioLevel });
  const cleanupRef = useRef(null);
  const rotation = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  valuesRef.current = { phase, audioLevel };

  useEffect(() => {
    if (!visible) return undefined;
    const rotationLoop = Animated.loop(Animated.timing(rotation, {
      toValue: 1,
      duration: phase === 'thinking' ? 9000 : 24000,
      easing: Easing.linear,
      useNativeDriver: true,
    }));
    const pulseLoop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: phase === 'speaking' ? 360 : 1300, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: phase === 'speaking' ? 360 : 1300, useNativeDriver: true }),
    ]));
    rotationLoop.start();
    pulseLoop.start();
    return () => {
      rotationLoop.stop();
      pulseLoop.stop();
      rotation.setValue(0);
      pulse.setValue(0);
    };
  }, [phase, pulse, rotation, visible]);

  const onContextCreate = useCallback((gl) => {
    let renderer;
    let geometry;
    let material;
    let frameId;
    let disposed = false;

    try {
      const width = gl.drawingBufferWidth || 320;
      const height = gl.drawingBufferHeight || 320;
      const canvas = {
        width,
        height,
        style: {},
        clientWidth: width,
        clientHeight: height,
        addEventListener: () => {},
        removeEventListener: () => {},
        setPointerCapture: () => {},
        releasePointerCapture: () => {},
        getContext: () => gl,
      };
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
      camera.position.z = 330;

      renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: true });
      renderer.setSize(width, height, false);
      renderer.setClearColor(0x090713, 0);

      geometry = createParticleGeometry();
      material = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uEnergy: { value: 0.04 }, uActivity: { value: 0 } },
        vertexShader,
        fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      scene.add(new THREE.Points(geometry, material));

      const render = (timestamp) => {
        if (disposed) return;
        const current = valuesRef.current;
        const active = current.phase === 'speaking' || current.phase === 'listening';
        material.uniforms.uTime.value = timestamp / 1000;
        material.uniforms.uEnergy.value = Math.max(0.04, Math.min(1, current.audioLevel || 0));
        material.uniforms.uActivity.value = active ? 1 : 0.22;
        renderer.render(scene, camera);
        gl.endFrameEXP();
        frameId = requestAnimationFrame(render);
      };
      frameId = requestAnimationFrame(render);
      cleanupRef.current = () => {
        disposed = true;
        if (frameId) cancelAnimationFrame(frameId);
        geometry?.dispose();
        material?.dispose();
        renderer?.dispose();
      };
    } catch (error) {
      console.warn('[ParticleOrb] Could not create Three.js scene:', error?.message || error);
      setRendererError(true);
      cleanupRef.current?.();
    }
  }, []);

  useEffect(() => {
    if (visible) setRendererError(false);
    else {
      cleanupRef.current?.();
      cleanupRef.current = null;
    }
  }, [visible]);

  useEffect(() => () => {
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, []);

  return (
    <View style={styles.container} accessibilityLabel="Audio reactive Dr. Red particle orb">
      {visible ? <GLView style={styles.gl} onContextCreate={onContextCreate} /> : null}
      <LinearGradient
        pointerEvents="none"
        colors={['#121126', '#0B1020', '#090713']}
        locations={[0, 0.58, 1]}
        style={styles.backdrop}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.fallbackCloud,
            {
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, phase === 'speaking' ? 1 : 0.9] }),
              transform: [
                { rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
                { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, phase === 'speaking' ? 1.08 : 1.02] }) },
              ],
            },
          ]}
        >
          {FALLBACK_PARTICLES.map((particle) => (
            <View
              key={particle.key}
              style={{
                position: 'absolute',
                left: particle.left,
                top: particle.top,
                width: particle.size,
                height: particle.size,
                borderRadius: particle.size / 2,
                backgroundColor: particle.color,
                opacity: particle.opacity,
                shadowColor: particle.color,
                shadowOpacity: 0.85,
                shadowRadius: 5,
                elevation: 3,
              }}
            />
          ))}
        </Animated.View>
        <View pointerEvents="none" style={styles.coreGlow} />
      </LinearGradient>
      {rendererError ? <View pointerEvents="none" style={styles.error}><Text style={styles.errorText}>Orb graphics are unavailable on this device</Text></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: 320, height: 320, borderRadius: 160, overflow: 'hidden', backgroundColor: '#090713' },
  backdrop: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', zIndex: 2, elevation: 2 },
  fallbackCloud: { ...StyleSheet.absoluteFillObject },
  coreGlow: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(75, 98, 174, 0.07)', shadowColor: '#64E7ED', shadowOpacity: 0.68, shadowRadius: 55, elevation: 18 },
  gl: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  error: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  errorText: { color: '#D9C8F0', fontSize: 13, textAlign: 'center' },
});
