import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const EstimateAnimation = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const mailboxRef = useRef<THREE.Group | null>(null);
  const paperRef = useRef<THREE.Mesh | null>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xf5f5f5);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    cameraRef.current = camera;
    camera.position.z = 5;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current = renderer;
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Create mailbox
    const mailboxGroup = new THREE.Group();
    mailboxRef.current = mailboxGroup;

    // Mailbox body
    const boxGeometry = new THREE.BoxGeometry(1.5, 2, 1);
    const boxMaterial = new THREE.MeshPhongMaterial({ color: 0x4a90e2 });
    const mailbox = new THREE.Mesh(boxGeometry, boxMaterial);
    mailboxGroup.add(mailbox);

    // Mailbox post
    const postGeometry = new THREE.BoxGeometry(0.2, 3, 0.2);
    const postMaterial = new THREE.MeshPhongMaterial({ color: 0x808080 });
    const post = new THREE.Mesh(postGeometry, postMaterial);
    post.position.y = -2.5;
    mailboxGroup.add(post);

    // Create paper (estimate)
    const paperGeometry = new THREE.PlaneGeometry(1, 1.4);
    const paperMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xffffff,
      side: THREE.DoubleSide
    });
    const paper = new THREE.Mesh(paperGeometry, paperMaterial);
    paperRef.current = paper;
    paper.position.x = 2;
    scene.add(paper);

    scene.add(mailboxGroup);

    // Animation
    let time = 0;
    const animate = () => {
      time += 0.01;
      
      if (mailboxGroup && paperRef.current) {
        // Mailbox gentle floating
        mailboxGroup.position.y = Math.sin(time) * 0.1;
        
        // Paper transformation animation
        if (time < Math.PI) {
          // Move paper towards mailbox
          paperRef.current.position.x = 2 - (time / Math.PI) * 2;
          paperRef.current.rotation.y = time * 2;
        } else if (time < Math.PI * 2) {
          // Transform paper (scaling effect)
          const scale = 1 + Math.sin((time - Math.PI) * 2) * 0.3;
          paperRef.current.scale.set(scale, scale, scale);
          paperRef.current.material.color.setHSL(time / 10, 1, 0.5);
        } else {
          // Reset animation
          time = 0;
        }
      }

      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return;
      
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mountRef.current && rendererRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="w-full h-64 rounded-lg overflow-hidden" />;
};