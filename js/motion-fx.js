/**
 * QR Code Manager SaaS — Motion & 3D Interactive Effects Engine
 * Powered by Three.js, GSAP & Framer-Motion style spring physics.
 */

(function(window) {
  'use strict';

  const MotionFX = {
    // Check if GSAP is available
    hasGSAP: () => typeof window.gsap !== 'undefined',
    hasThree: () => typeof window.THREE !== 'undefined',

    /**
     * Apply 3D Perspective Tilt with dynamic specular glare
     * @param {string|NodeList} selector - CSS selector or elements
     * @param {object} options - max tilt angle, scale, glare
     */
    apply3DTilt(selector, options = {}) {
      const elements = typeof selector === 'string' ? document.querySelectorAll(selector) : selector;
      if (!elements || !elements.length) return;

      const maxTilt = options.maxTilt || 12; // degrees
      const scale = options.scale || 1.025;
      const speed = options.speed || 400; // ms transition speed
      const perspective = options.perspective || 1000;

      elements.forEach(card => {
        card.style.transformStyle = 'preserve-3d';
        card.style.transition = `transform ${speed}ms cubic-bezier(0.23, 1, 0.32, 1), box-shadow ${speed}ms cubic-bezier(0.23, 1, 0.32, 1)`;
        card.style.willChange = 'transform';

        // Add specular glare overlay if enabled
        let glare = card.querySelector('.fx-glare');
        if (!glare && options.glare !== false) {
          glare = document.createElement('div');
          glare.className = 'fx-glare';
          glare.style.cssText = 'position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity 0.3s ease;background:radial-gradient(circle 250px at 50% 50%, rgba(255,255,255,0.22), transparent 70%);z-index:10;';
          card.style.position = card.style.position || 'relative';
          card.appendChild(glare);
        }

        function handleMouseMove(e) {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;

          const tiltX = ((y - centerY) / centerY) * -maxTilt;
          const tiltY = ((x - centerX) / centerX) * maxTilt;

          card.style.transform = `perspective(${perspective}px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`;
          
          if (glare) {
            glare.style.opacity = '1';
            glare.style.background = `radial-gradient(circle 220px at ${x}px ${y}px, rgba(255,255,255,0.25), transparent 70%)`;
          }
        }

        function handleMouseLeave() {
          card.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
          if (glare) glare.style.opacity = '0';
        }

        card.addEventListener('mousemove', handleMouseMove);
        card.addEventListener('mouseleave', handleMouseLeave);
      });
    },

    /**
     * Magnetic Buttons (Framer Motion style spring magnetism)
     */
    applyMagnetic(selector, strength = 0.35) {
      const elements = typeof selector === 'string' ? document.querySelectorAll(selector) : selector;
      if (!elements || !elements.length) return;

      elements.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
          const rect = btn.getBoundingClientRect();
          const x = (e.clientX - rect.left - rect.width / 2) * strength;
          const y = (e.clientY - rect.top - rect.height / 2) * strength;

          if (window.gsap) {
            gsap.to(btn, { x: x, y: y, duration: 0.3, ease: 'power2.out' });
          } else {
            btn.style.transform = `translate(${x}px, ${y}px)`;
          }
        });

        btn.addEventListener('mouseleave', () => {
          if (window.gsap) {
            gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
          } else {
            btn.style.transform = 'translate(0px, 0px)';
          }
        });
      });
    },

    /**
     * Staggered Scroll Entrance Animations using GSAP + ScrollTrigger
     */
    initScrollReveals() {
      if (!window.gsap) return;

      if (window.ScrollTrigger) {
        gsap.registerPlugin(ScrollTrigger);
      }

      // Fade up elements with class .fx-fade-up
      document.querySelectorAll('.fx-fade-up').forEach(el => {
        gsap.fromTo(el, 
          { opacity: 0, y: 35 }, 
          {
            opacity: 1,
            y: 0,
            duration: 0.85,
            ease: 'power3.out',
            scrollTrigger: window.ScrollTrigger ? {
              trigger: el,
              start: 'top 88%',
              toggleActions: 'play none none none'
            } : undefined
          }
        );
      });

      // Stagger lists or grids with .fx-stagger
      document.querySelectorAll('.fx-stagger').forEach(container => {
        const children = container.children;
        if (!children || !children.length) return;

        gsap.fromTo(children,
          { opacity: 0, y: 30, scale: 0.96 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.7,
            stagger: 0.08,
            ease: 'power3.out',
            scrollTrigger: window.ScrollTrigger ? {
              trigger: container,
              start: 'top 85%',
              toggleActions: 'play none none none'
            } : undefined
          }
        );
      });
    },

    /**
     * Animated Number Counter (GSAP)
     */
    animateCounter(element, targetValue, duration = 1.8, prefix = '', suffix = '') {
      if (!element || !window.gsap) return;
      const obj = { val: 0 };
      gsap.to(obj, {
        val: targetValue,
        duration: duration,
        ease: 'power2.out',
        onUpdate: () => {
          element.textContent = prefix + Math.floor(obj.val).toLocaleString() + suffix;
        }
      });
    },

    /**
     * Interactive 3D QR Hologram Scene in Hero
     * Uses Three.js to render a sleek, glowing, interactive 3D QR Matrix with orbiting particles & cursor tracking
     */
    createHero3DScene(containerId) {
      if (!window.THREE) {
        console.warn('Three.js not loaded. Skipping 3D Hero scene.');
        return;
      }

      const container = document.getElementById(containerId);
      if (!container) return;

      const width = container.clientWidth || 400;
      const height = container.clientHeight || 400;

      // Scene, Camera, Renderer
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(0, 0, 7.5);

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.appendChild(renderer.domElement);
      renderer.domElement.style.outline = 'none';

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambientLight);

      const mainLight = new THREE.DirectionalLight(0x5B43D6, 2.5);
      mainLight.position.set(5, 8, 5);
      scene.add(mainLight);

      const rimLight = new THREE.DirectionalLight(0x10B981, 1.8);
      rimLight.position.set(-6, -4, 4);
      scene.add(rimLight);

      const pointLight = new THREE.PointLight(0xA594F9, 3, 20);
      pointLight.position.set(0, 0, 3);
      scene.add(pointLight);

      // Group holding the 3D QR Monolith
      const monolithGroup = new THREE.Group();
      scene.add(monolithGroup);

      // Base Glass Plate with rounded beveled feel
      const baseGeometry = new THREE.BoxGeometry(3.6, 3.6, 0.28);
      const baseMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x17161D,
        metalness: 0.15,
        roughness: 0.1,
        transmission: 0.6,
        transparent: true,
        opacity: 0.95,
        reflectivity: 0.9,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1
      });
      const basePlate = new THREE.Mesh(baseGeometry, baseMaterial);
      basePlate.position.z = -0.15;
      monolithGroup.add(basePlate);

      // Glowing Rim Ring around plate
      const ringGeo = new THREE.RingGeometry(2.6, 2.7, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x5B43D6,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.z = -0.28;
      monolithGroup.add(ring);

      // 3D QR Matrix Pattern Cubes
      const cubeGeo = new THREE.BoxGeometry(0.24, 0.24, 0.26);
      const cubeMatBrand = new THREE.MeshStandardMaterial({
        color: 0x5B43D6,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0x331E82,
        emissiveIntensity: 0.45
      });
      const cubeMatAccent = new THREE.MeshStandardMaterial({
        color: 0x16794B,
        metalness: 0.85,
        roughness: 0.25,
        emissive: 0x0A4426,
        emissiveIntensity: 0.35
      });
      const cubeMatWhite = new THREE.MeshStandardMaterial({
        color: 0xFAF9FD,
        metalness: 0.3,
        roughness: 0.15
      });

      // Synthetic 11x11 stylized QR module grid
      const grid = [
        [1,1,1,1,1,0,1,1,1,1,1],
        [1,0,0,0,1,0,1,0,0,0,1],
        [1,0,2,0,1,0,1,0,2,0,1],
        [1,0,0,0,1,0,1,0,0,0,1],
        [1,1,1,1,1,0,1,1,1,1,1],
        [0,0,0,0,0,1,0,0,0,0,0],
        [1,0,1,0,1,1,1,0,1,0,1],
        [1,1,1,1,1,0,1,1,0,1,0],
        [1,0,0,0,1,0,0,1,1,0,1],
        [1,0,2,0,1,0,1,0,0,1,1],
        [1,1,1,1,1,0,1,1,1,0,1],
      ];

      const offset = 5 * 0.29;
      grid.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell > 0) {
            const mat = cell === 2 ? cubeMatAccent : (Math.random() > 0.4 ? cubeMatBrand : cubeMatWhite);
            const mesh = new THREE.Mesh(cubeGeo, mat);
            mesh.position.set(c * 0.29 - offset, -(r * 0.29 - offset), 0.14);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            monolithGroup.add(mesh);
          }
        });
      });

      // Floating Particle Cloud Orbiting the Monolith
      const particleCount = 140;
      const particleGeo = new THREE.BufferGeometry();
      const particlePositions = new Float32Array(particleCount * 3);
      const particleColors = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount; i++) {
        const radius = 2.4 + Math.random() * 2.2;
        const theta = Math.random() * Math.PI * 2;
        const phi = (Math.random() - 0.5) * Math.PI;

        particlePositions[i * 3] = radius * Math.cos(theta) * Math.cos(phi);
        particlePositions[i * 3 + 1] = radius * Math.sin(phi);
        particlePositions[i * 3 + 2] = radius * Math.sin(theta) * Math.cos(phi);

        // Soft violet and emerald particles
        if (Math.random() > 0.3) {
          particleColors[i * 3] = 0.55;     // R
          particleColors[i * 3 + 1] = 0.42; // G
          particleColors[i * 3 + 2] = 0.95; // B
        } else {
          particleColors[i * 3] = 0.1;
          particleColors[i * 3 + 1] = 0.8;
          particleColors[i * 3 + 2] = 0.5;
        }
      }

      particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
      particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

      const particleMat = new THREE.PointsMaterial({
        size: 0.08,
        vertexColors: true,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending
      });
      const particles = new THREE.Points(particleGeo, particleMat);
      scene.add(particles);

      // Mouse Parallax Interactivity
      let targetRotX = 0.25;
      let targetRotY = -0.35;
      let isDragging = false;
      let prevMouseX = 0;
      let prevMouseY = 0;

      function onMouseMove(e) {
        const rect = renderer.domElement.getBoundingClientRect();
        const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const normY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

        if (!isDragging) {
          targetRotY = normX * 0.75;
          targetRotX = -normY * 0.65;
        } else {
          const deltaX = e.clientX - prevMouseX;
          const deltaY = e.clientY - prevMouseY;
          monolithGroup.rotation.y += deltaX * 0.01;
          monolithGroup.rotation.x += deltaY * 0.01;
          prevMouseX = e.clientX;
          prevMouseY = e.clientY;
        }
      }

      renderer.domElement.addEventListener('mousedown', (e) => {
        isDragging = true;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      });

      window.addEventListener('mouseup', () => { isDragging = false; });
      window.addEventListener('mousemove', onMouseMove);

      // Handle Resize
      window.addEventListener('resize', () => {
        if (!container) return;
        const newW = container.clientWidth;
        const newH = container.clientHeight;
        if (newW && newH) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        }
      });

      // Animation Loop
      let clock = new THREE.Clock();
      function animate() {
        requestAnimationFrame(animate);
        const elapsedTime = clock.getElapsedTime();

        // Smooth damping interpolation towards mouse target
        if (!isDragging) {
          monolithGroup.rotation.y += (targetRotY - monolithGroup.rotation.y) * 0.05;
          monolithGroup.rotation.x += (targetRotX - monolithGroup.rotation.x) * 0.05;
        }

        // Gentle floating levitation
        monolithGroup.position.y = Math.sin(elapsedTime * 1.6) * 0.12;

        // Orbiting particle cloud
        particles.rotation.y = elapsedTime * 0.12;
        particles.rotation.x = Math.sin(elapsedTime * 0.2) * 0.15;

        // Pulsing light
        pointLight.intensity = 2.5 + Math.sin(elapsedTime * 2.5) * 0.8;

        renderer.render(scene, camera);
      }

      animate();
    }
  };

  window.MotionFX = MotionFX;
})(window);
