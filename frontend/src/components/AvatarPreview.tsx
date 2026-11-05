import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { Avatar } from '../api/user';
import { createAvatarModel, disposeAvatarModel } from '../lib/avatarModel';
import type { AvatarPalette } from '../lib/avatarPreview';
import styles from './AvatarPreview.module.css';

interface AvatarPreviewProps {
  avatar: Avatar;
  palette: AvatarPalette;
  /** full: 전신을 천천히 돌려 보여준다. face: 얼굴 부분만 정면으로 보여준다(작은 썸네일용). */
  variant?: 'full' | 'face';
  className?: string;
}

/** 캐릭터 한 명을 작은 Three.js 캔버스에 그린다. 프로필 미리보기와 마을 헤더 썸네일이 쓴다. */
function AvatarPreview({ avatar, palette, variant = 'full', className }: AvatarPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    sun.position.set(3, 5, 4);
    scene.add(sun);

    const model = createAvatarModel(avatar, palette);
    scene.add(model);

    const camera = new THREE.PerspectiveCamera(variant === 'face' ? 30 : 35, 1, 0.1, 50);
    if (variant === 'face') {
      camera.position.set(0, 1.4, 3.8);
      camera.lookAt(0, 1.4, 0);
    } else {
      camera.position.set(0, 1.2, 5);
      camera.lookAt(0, 0.98, 0);
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const resize = () => {
      const { clientWidth, clientHeight } = container;
      renderer.setSize(clientWidth, clientHeight);
      camera.aspect = clientWidth / Math.max(clientHeight, 1);
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    let frameId = 0;
    function animate(time: number) {
      if (variant === 'full') {
        model.rotation.y = Math.sin(time / 1200) * 0.6;
      }
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }
    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      disposeAvatarModel(model);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [avatar, palette, variant]);

  return <div ref={containerRef} className={`${styles.container} ${className ?? ''}`} />;
}

export default AvatarPreview;
