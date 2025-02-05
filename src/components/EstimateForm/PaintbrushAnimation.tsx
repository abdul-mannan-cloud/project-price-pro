import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const PaintbrushAnimation = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    rendererRef.current = renderer;
    
    renderer.setSize(200, 200);
    containerRef.current.appendChild(renderer.domElement);

    // Create paintbrush handle
    const handleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2, 32);
    const handleMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.rotation.x = Math.PI / 4;

    // Create brush head
    const brushGeometry = new THREE.ConeGeometry(0.3, 0.8, 32);
    const brushMaterial = new THREE.MeshPhongMaterial({ color: 0xf5f5f5 });
    const brush = new THREE.Mesh(brushGeometry, brushMaterial);
    brush.position.y = 1.2;
    brush.rotation.x = Math.PI / 4;

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);

    scene.add(handle);
    scene.add(brush);
    scene.add(ambientLight);
    scene.add(directionalLight);

    camera.position.z = 5;

    let frame = 0;
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      frame += 0.02;
      
      // Paintbrush painting motion
      handle.rotation.z = Math.sin(frame) * 0.2;
      brush.rotation.z = Math.sin(frame) * 0.2;
      
      // Gentle floating motion
      handle.position.y = Math.sin(frame * 0.5) * 0.1;
      brush.position.y = 1.2 + Math.sin(frame * 0.5) * 0.1;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      // Clean up geometries and materials
      handleGeometry.dispose();
      handleMaterial.dispose();
      brushGeometry.dispose();
      brushMaterial.dispose();
    };
  }, []);

  return <div ref={containerRef} className="w-[200px] h-[200px] mx-auto" />;
};