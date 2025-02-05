import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const EstimateAnimation = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const animationFrameIdRef = useRef<number>();

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    rendererRef.current = renderer;
    
    renderer.setSize(200, 200);
    containerRef.current.appendChild(renderer.domElement);

    // Create mailbox
    const mailboxGeometry = new THREE.BoxGeometry(1, 1.5, 1);
    const mailboxMaterial = new THREE.MeshBasicMaterial({ color: 0x4f46e5 });
    const mailbox = new THREE.Mesh(mailboxGeometry, mailboxMaterial);

    // Create paper
    const paperGeometry = new THREE.PlaneGeometry(0.8, 1);
    const paperMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffffff,
      side: THREE.DoubleSide 
    });
    const paper = new THREE.Mesh(paperGeometry, paperMaterial);
    paper.position.set(0, 2, 0);

    scene.add(mailbox);
    scene.add(paper);

    camera.position.z = 5;

    let paperRotation = 0;
    let paperY = 2;

    const animate = () => {
      if (!rendererRef.current || !sceneRef.current) return;
      
      animationFrameIdRef.current = requestAnimationFrame(animate);

      // Animate paper
      paperRotation += 0.02;
      if (paperY > 0) {
        paperY -= 0.01;
      }
      
      paper.rotation.y = paperRotation;
      paper.position.y = paperY;

      rendererRef.current.render(sceneRef.current, camera);
    };

    animate();

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }

      // Clean up Three.js resources
      mailboxGeometry.dispose();
      mailboxMaterial.dispose();
      paperGeometry.dispose();
      paperMaterial.dispose();

      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (containerRef.current?.contains(rendererRef.current.domElement)) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current = null;
      }

      if (sceneRef.current) {
        sceneRef.current.clear();
        sceneRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} className="w-[200px] h-[200px] mx-auto" />;
};