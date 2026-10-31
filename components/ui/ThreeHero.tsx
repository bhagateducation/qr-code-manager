'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeHero() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 360;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 7.2);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0x5b43d6, 3.0);
    mainLight.position.set(5, 8, 5);
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0x10b981, 2.0);
    rimLight.position.set(-6, -4, 4);
    scene.add(rimLight);

    const pointLight = new THREE.PointLight(0xa594f9, 3.5, 20);
    pointLight.position.set(0, 0, 3);
    scene.add(pointLight);

    // Monolith 3D Object Group
    const monolithGroup = new THREE.Group();
    scene.add(monolithGroup);

    // Base Glass Plate
    const baseGeometry = new THREE.BoxGeometry(3.6, 3.6, 0.28);
    const baseMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x17161d,
      metalness: 0.2,
      roughness: 0.1,
      transmission: 0.65,
      transparent: true,
      opacity: 0.95,
      reflectivity: 0.9,
      clearcoat: 1.0,
    });
    const basePlate = new THREE.Mesh(baseGeometry, baseMaterial);
    basePlate.position.z = -0.15;
    monolithGroup.add(basePlate);

    // Stylized QR Modules Matrix
    const cubeGeo = new THREE.BoxGeometry(0.24, 0.24, 0.26);
    const matBrand = new THREE.MeshStandardMaterial({
      color: 0x5b43d6,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x331e82,
      emissiveIntensity: 0.45,
    });
    const matAccent = new THREE.MeshStandardMaterial({
      color: 0x16794b,
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0x0a4426,
      emissiveIntensity: 0.4,
    });
    const matWhite = new THREE.MeshStandardMaterial({
      color: 0xfaf9fd,
      metalness: 0.3,
      roughness: 0.15,
    });

    const grid = [
      [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1],
      [1, 0, 2, 0, 1, 0, 1, 0, 2, 0, 1],
      [1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1],
      [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
      [1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1],
      [1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0],
      [1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 1],
      [1, 0, 2, 0, 1, 0, 1, 0, 0, 1, 1],
      [1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1],
    ];

    const offset = 5 * 0.29;
    grid.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell > 0) {
          const mat = cell === 2 ? matAccent : Math.random() > 0.4 ? matBrand : matWhite;
          const mesh = new THREE.Mesh(cubeGeo, mat);
          mesh.position.set(c * 0.29 - offset, -(r * 0.29 - offset), 0.14);
          monolithGroup.add(mesh);
        }
      });
    });

    // Orbiting Particles
    const count = 120;
    const pGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const radius = 2.4 + Math.random() * 2.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;

      pos[i * 3] = radius * Math.cos(theta) * Math.cos(phi);
      pos[i * 3 + 1] = radius * Math.sin(phi);
      pos[i * 3 + 2] = radius * Math.sin(theta) * Math.cos(phi);

      colors[i * 3] = 0.55;
      colors[i * 3 + 1] = 0.42;
      colors[i * 3 + 2] = 0.95;
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const pMat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // Mouse Tracking
    let targetRotX = 0.2;
    let targetRotY = -0.3;
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      if (!isDragging) {
        targetRotY = normX * 0.65;
        targetRotX = -normY * 0.55;
      } else {
        const deltaX = e.clientX - prevX;
        const deltaY = e.clientY - prevY;
        monolithGroup.rotation.y += deltaX * 0.01;
        monolithGroup.rotation.x += deltaY * 0.01;
        prevX = e.clientX;
        prevY = e.clientY;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);

    // Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      if (!isDragging) {
        monolithGroup.rotation.y += (targetRotY - monolithGroup.rotation.y) * 0.05;
        monolithGroup.rotation.x += (targetRotX - monolithGroup.rotation.x) * 0.05;
      }

      monolithGroup.position.y = Math.sin(elapsed * 1.5) * 0.1;
      particles.rotation.y = elapsed * 0.12;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full max-w-[420px] h-[350px] mx-auto flex items-center justify-center">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center" />
      <div className="absolute bottom-2 px-3.5 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-line text-[11px] font-medium text-muted pointer-events-none shadow-sm flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        <span className="font-semibold text-ink">Three.js 3D QR Matrix</span>
        <span className="text-gray-400">• Drag or hover to inspect</span>
      </div>
    </div>
  );
}
