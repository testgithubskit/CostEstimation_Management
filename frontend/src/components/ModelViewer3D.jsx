import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Stage, Gltf, useProgress, Html, GizmoHelper, GizmoViewcube } from '@react-three/drei';
import { Empty, Grid } from 'antd';

const { useBreakpoint } = Grid;

function Loader() {
  const { progress } = useProgress();
  return <Html center>{progress.toFixed(1)} % loaded</Html>;
}

// Component to handle screenshot capture
function CaptureController({ onCaptureRef, showGizmo, isMobile }) {
  const { gl, scene, camera } = useThree();
  
  useEffect(() => {
    if (onCaptureRef) {
      onCaptureRef.current = () => {
        if (gl) {
          gl.render(scene, camera);
          return gl.domElement.toDataURL('image/png');
        }
        return null;
      };
    }
  }, [onCaptureRef, gl, scene, camera]);

  return (
    <>
      {showGizmo && (
        <GizmoHelper alignment="top-right" margin={[isMobile ? 60 : 80, isMobile ? 60 : 80]}>
          <GizmoViewcube />
        </GizmoHelper>
      )}
    </>
  );
}

const ModelViewer3D = ({ has3D, modelUrl, onCaptureRef }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [showGizmo, setShowGizmo] = useState(true);
  const glRef = useRef(null);

  // Create a modified capture function that temporarily hides gizmo
  useEffect(() => {
    if (onCaptureRef) {
      onCaptureRef.current = () => {
        // Hide gizmo
        setShowGizmo(false);
        
        // Wait for React to re-render without gizmo
        return new Promise((resolve) => {
          setTimeout(() => {
            if (glRef.current) {
              const screenshot = glRef.current.domElement.toDataURL('image/png');
              // Show gizmo again
              setShowGizmo(true);
              resolve(screenshot);
            } else {
              setShowGizmo(true);
              resolve(null);
            }
          }, 100);
        });
      };
    }
  }, [onCaptureRef, showGizmo]);

  if (!has3D) {
    return (
      <div style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: '#fafafa' 
      }}>
        <Empty description="3D Model Not Available" />
      </div>
    );
  }

  return (
    <Canvas 
      shadows 
      dpr={[1, 2]} 
      gl={{ preserveDrawingBuffer: true }}
      camera={{ 
        position: [5, 5, 5],
        fov: 45
      }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%'
      }}
      onCreated={({ gl }) => {
        glRef.current = gl;
      }}
    >
      <Suspense fallback={<Loader />}>
        <Stage 
          environment="city"
          intensity={1}
        >
          <Gltf src={modelUrl} />
        </Stage>
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} />
        <OrbitControls makeDefault />
        <CaptureController onCaptureRef={onCaptureRef} showGizmo={showGizmo} isMobile={isMobile} />
      </Suspense>
    </Canvas>
  );
};

export default ModelViewer3D;