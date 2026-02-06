'use client';

import { Application, Entity } from '@playcanvas/react';
import { Camera, GSplat, Script } from '@playcanvas/react/components';
import { useSplat } from '@playcanvas/react/hooks';
import { CameraControls } from 'playcanvas/scripts/esm/camera-controls.mjs';
import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { Vec2, Vec3, type Entity as PCEntity } from 'playcanvas';
import { CLILoader, CLIMiniLoader } from '@/components/UI/CLILoader';
import { CLIFrame, CLISection, CLIButton } from '@/components/UI/CLIFrame';
import { useParallax } from './useParallax';
import type { ParallaxAmount } from '@/lib/types';

interface SplatConfig {
  splatFile: string;
  title: string;
  date?: string;
  description?: string;
  town?: string;
  coordinates?: [number, number];
  fov?: number;
  cameraPosition: [number, number, number];
  focusPoint: [number, number, number];
  parallaxAmount?: ParallaxAmount;
  zoomRange?: [number, number];
}

interface Settings {
  fov: number;
  parallaxAmount?: ParallaxAmount;
}

const GRAPHICS_DEVICE_OPTIONS = {
  antialias: false,
  alpha: false,
};

const SPLAT_ROTATION: [number, number, number] = [180, 0, 0];
const DEFAULT_CAMERA_POSITION: [number, number, number] = [0, 0, 3];
const DEFAULT_FOCUS_POINT: [number, number, number] = [0, 0, 0];
const DEFAULT_CONFIG_CAMERA_POSITION: [number, number, number] = [0, 0, 3];

const DEFAULT_PARALLAX_AMOUNT: ParallaxAmount = { yaw: 8, pitch: 4 };

function formatCoord(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lon).toFixed(4)}°${lonDir}`;
}

function NudgeRow({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label?: string;
  value: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.6rem', marginTop: label ? '0.15rem' : 0 }}>
      {label && <span style={{ width: '1rem', opacity: 0.7 }}>{label}</span>}
      <CLIButton onClick={onMinus}>&minus;</CLIButton>
      <span style={{ minWidth: '3rem', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      <CLIButton onClick={onPlus}>+</CLIButton>
    </div>
  );
}

const SplatScene = memo(function SplatScene({
  splatUrl,
  fov,
  cameraRef,
  onAssetLoaded,
}: {
  splatUrl: string;
  fov: number;
  cameraRef: React.MutableRefObject<PCEntity | null>;
  onAssetLoaded?: () => void;
}) {
  const { asset } = useSplat(splatUrl);

  // Notify parent when asset loads
  useEffect(() => {
    if (asset && onAssetLoaded) {
      onAssetLoaded();
    }
  }, [asset, onAssetLoaded]);

  return (
    <>
      <Entity position={DEFAULT_CAMERA_POSITION} ref={cameraRef}>
        <Camera fov={fov} clearColor="#111111" />
        <Script script={CameraControls} />
      </Entity>

      {asset && (
        <Entity rotation={SPLAT_ROTATION}>
          <GSplat asset={asset} />
        </Entity>
      )}
    </>
  );
});

interface SplatViewerProps {
  config: {
    splats: SplatConfig[];
    settings: Settings;
  };
}

interface LiveValues {
  fov: number;
  cameraPosition: [number, number, number];
  focusPoint: [number, number, number];
  distance: number;
}

export default function SplatViewer({ config }: SplatViewerProps) {
  const [hasBooted, setHasBooted] = useState(true); // TODO: restore to false to re-enable boot animation
  const [currentIndex, setCurrentIndex] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const [controlMode, setControlMode] = useState(false);
  const [activeFov, setActiveFov] = useState<number | null>(null);
  const [activeParallax, setActiveParallax] = useState<ParallaxAmount | null>(null);
  const [liveValues, setLiveValues] = useState<LiveValues | null>(null);
  const [loaderVisible, setLoaderVisible] = useState(true);
  const [tutorialVisible, setTutorialVisible] = useState(true);
  const [tutorialDismissing, setTutorialDismissing] = useState(false);
  const tutorialDismissedRef = useRef(false);
  const tutorialMouseMovedRef = useRef(false);
  const tutorialTimerReadyRef = useRef(false);
  const cameraRef = useRef<PCEntity | null>(null);

  // Detect mobile (compute once)
  const isMobile = useMemo(
    () => typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
    []
  );

  const { splats, settings } = config;
  const currentSplat = splats[currentIndex];

  const handleBootComplete = useCallback(() => {
    setHasBooted(true);
  }, []);

  const showLoader = useCallback(() => {
    setLoaderVisible(true);
  }, []);

  const handleAssetLoaded = useCallback(() => {
    setLoaderVisible(false);
  }, []);

  // Tutorial: dismiss after mouse move + 3 second minimum
  const tryDismissTutorial = useCallback(() => {
    if (tutorialDismissedRef.current) return;
    if (tutorialMouseMovedRef.current && tutorialTimerReadyRef.current) {
      tutorialDismissedRef.current = true;
      setTutorialDismissing(true);
      setTimeout(() => setTutorialVisible(false), 1500);
    }
  }, []);

  const handleParallaxMouseMove = useCallback(() => {
    if (tutorialMouseMovedRef.current) return;
    tutorialMouseMovedRef.current = true;
    tryDismissTutorial();
  }, [tryDismissTutorial]);

  useEffect(() => {
    if (tutorialDismissedRef.current) return;
    const timer = setTimeout(() => {
      tutorialTimerReadyRef.current = true;
      tryDismissTutorial();
    }, 3000);
    return () => clearTimeout(timer);
  }, [tryDismissTutorial]);

  // Mobile: dismiss tutorial on touch
  useEffect(() => {
    if (!isMobile || tutorialDismissedRef.current) return;
    const onTouch = () => {
      tutorialMouseMovedRef.current = true;
      tryDismissTutorial();
    };
    window.addEventListener('touchstart', onTouch);
    return () => window.removeEventListener('touchstart', onTouch);
  }, [isMobile, tryDismissTutorial]);

  // Get camera pose config for current splat (memoized to stabilize useEffect deps)
  const fp = currentSplat?.focusPoint ?? DEFAULT_FOCUS_POINT;
  const configFocusPoint = useMemo<[number, number, number]>(
    () => [fp[0], fp[1], fp[2]],
    [fp[0], fp[1], fp[2]]
  );
  const cp = currentSplat?.cameraPosition ?? DEFAULT_CONFIG_CAMERA_POSITION;
  const configCameraPosition = useMemo<[number, number, number]>(
    () => [cp[0], cp[1], cp[2]],
    [cp[0], cp[1], cp[2]]
  );

  // Parallax amount: active (editing) > per-splat > settings > default
  const pa = activeParallax ?? currentSplat?.parallaxAmount ?? settings.parallaxAmount ?? DEFAULT_PARALLAX_AMOUNT;
  const parallaxAmount = useMemo<ParallaxAmount>(
    () => ({ yaw: pa.yaw, pitch: pa.pitch }),
    [pa.yaw, pa.pitch]
  );

  // Parallax: enabled when booted, not in edit mode, and not mobile
  useParallax(cameraRef, configFocusPoint, configCameraPosition, parallaxAmount, hasBooted && !controlMode && !isMobile, handleParallaxMouseMove, currentSplat?.zoomRange);

  // Initialize CameraControls pose and settings
  useEffect(() => {
    if (!hasBooted || !currentSplat) return;

    let initialized = false;
    let animationId: number;

    const initPose = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scripts = cameraRef.current?.script as any;
      const cameraControls = scripts?.cameraControls;
      if (cameraControls && !initialized) {
        const focus = new Vec3(configFocusPoint[0], configFocusPoint[1], configFocusPoint[2]);
        const position = new Vec3(configCameraPosition[0], configCameraPosition[1], configCameraPosition[2]);

        // Initialize camera position and focus point
        if (cameraControls.reset) {
          cameraControls.reset(focus, position);
        }

        // Match current mode
        cameraControls.enabled = controlMode;

        if (controlMode) {
          const poseAngles = cameraControls._pose?.angles;
          if (poseAngles) {
            cameraControls.pitchRange = new Vec2(poseAngles.x - 90, poseAngles.x + 90);
            cameraControls.yawRange = new Vec2(-Infinity, Infinity);
          }
          cameraControls.rotateSpeed = 0.3;
        } else {
          cameraControls.rotateSpeed = 0.08;
        }
        initialized = true;
      }
    };

    const animate = () => {
      initPose();
      if (!initialized) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [hasBooted, currentSplat, configFocusPoint, configCameraPosition, resetKey]);

  // Toggle CameraControls on controlMode change
  useEffect(() => {
    if (!hasBooted) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scripts = cameraRef.current?.script as any;
    const cameraControls = scripts?.cameraControls;
    if (!cameraControls) return;

    if (controlMode) {
      // Reset controller to current pose before enabling to flush stale smoothing state
      const poseObj = cameraControls._pose;
      if (poseObj && cameraControls.reset) {
        const pos = poseObj.position;
        const dist = poseObj.distance;
        const angles = poseObj.angles;
        const pitch = angles.x * Math.PI / 180;
        const yaw = angles.y * Math.PI / 180;
        const focus = new Vec3(
          pos.x + (-Math.sin(yaw) * Math.cos(pitch)) * dist,
          pos.y + Math.sin(pitch) * dist,
          pos.z + (-Math.cos(yaw) * Math.cos(pitch)) * dist,
        );
        cameraControls.reset(focus, new Vec3(pos.x, pos.y, pos.z));
      }

      cameraControls.enabled = true;
      const poseAngles = cameraControls._pose?.angles;
      if (poseAngles) {
        cameraControls.pitchRange = new Vec2(poseAngles.x - 90, poseAngles.x + 90);
        cameraControls.yawRange = new Vec2(-Infinity, Infinity);
      }
      cameraControls.rotateSpeed = 0.3;
    } else {
      cameraControls.enabled = false;
    }
  }, [controlMode, hasBooted]);

  // Live value polling in edit mode
  useEffect(() => {
    if (!controlMode || !hasBooted) {
      setLiveValues(null);
      return;
    }

    const poll = () => {
      const entity = cameraRef.current;
      if (!entity) return;

      const fov = activeFov ?? entity.camera?.fov ?? settings.fov;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scripts = entity.script as any;
      const poseObj = scripts?.cameraControls?._pose;
      if (!poseObj) return;

      const camPos = poseObj.position;
      const dist = poseObj.distance;
      const pitch = poseObj.angles.x * Math.PI / 180;
      const yaw = poseObj.angles.y * Math.PI / 180;

      const dirX = -Math.sin(yaw) * Math.cos(pitch);
      const dirY = Math.sin(pitch);
      const dirZ = -Math.cos(yaw) * Math.cos(pitch);

      setLiveValues({
        fov: Math.round(fov),
        cameraPosition: [
          parseFloat(camPos.x.toFixed(2)),
          parseFloat(camPos.y.toFixed(2)),
          parseFloat(camPos.z.toFixed(2)),
        ],
        focusPoint: [
          parseFloat((camPos.x + dirX * dist).toFixed(2)),
          parseFloat((camPos.y + dirY * dist).toFixed(2)),
          parseFloat((camPos.z + dirZ * dist).toFixed(2)),
        ],
        distance: parseFloat(dist.toFixed(2)),
      });
    };

    poll();
    const interval = setInterval(poll, 100);
    return () => clearInterval(interval);
  }, [controlMode, hasBooted, activeFov, settings.fov]);

  // Sync activeFov and activeParallax when splat changes
  useEffect(() => {
    setActiveFov(null);
    setActiveParallax(null);
  }, [currentIndex]);

  // Reset by reloading the current splat
  const resetCamera = useCallback(() => {
    showLoader();
    setResetKey(k => k + 1);
  }, [showLoader]);

  // Log current camera state to console
  const logCameraState = useCallback(() => {
    const entity = cameraRef.current;
    if (!entity) return;

    const fov = entity.camera?.fov ?? settings.fov;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scripts = entity.script as any;
    const cameraControls = scripts?.cameraControls;
    const poseObj = cameraControls?._pose;

    if (poseObj) {
      const camPos = poseObj.position;
      const dist = poseObj.distance;
      const pitch = poseObj.angles.x * Math.PI / 180;
      const yaw = poseObj.angles.y * Math.PI / 180;

      // Calculate focus point from camera position + direction * distance
      const dirX = -Math.sin(yaw) * Math.cos(pitch);
      const dirY = Math.sin(pitch);  // Positive pitch looks down in CameraControls
      const dirZ = -Math.cos(yaw) * Math.cos(pitch);

      const focusPt = {
        x: camPos.x + dirX * dist,
        y: camPos.y + dirY * dist,
        z: camPos.z + dirZ * dist,
      };

      const output = {
        fov: Math.round(fov),
        cameraPosition: [
          parseFloat(camPos.x.toFixed(2)),
          parseFloat(camPos.y.toFixed(2)),
          parseFloat(camPos.z.toFixed(2)),
        ],
        focusPoint: [
          parseFloat(focusPt.x.toFixed(2)),
          parseFloat(focusPt.y.toFixed(2)),
          parseFloat(focusPt.z.toFixed(2)),
        ],
      };
      console.log('Current camera state:', JSON.stringify(output, null, 2));
    }
  }, [settings.fov]);

  // Nudge FOV
  const nudgeFov = useCallback((delta: number) => {
    const entity = cameraRef.current;
    if (!entity?.camera) return;
    const current = activeFov ?? entity.camera.fov;
    const newFov = Math.max(1, Math.round(current + delta));
    entity.camera.fov = newFov;
    setActiveFov(newFov);
  }, [activeFov]);

  // Nudge distance
  const nudgeDistance = useCallback((delta: number) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scripts = cameraRef.current?.script as any;
    const poseObj = scripts?.cameraControls?._pose;
    if (!poseObj) return;
    poseObj.distance = Math.max(0.1, poseObj.distance + delta);
  }, []);

  // Nudge camera position on an axis
  const nudgePosition = useCallback((axis: 'x' | 'y' | 'z', delta: number) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scripts = cameraRef.current?.script as any;
    const cc = scripts?.cameraControls;
    const poseObj = cc?._pose;
    if (!poseObj) return;
    poseObj.position[axis] += delta;
  }, []);

  // Nudge parallax amount
  const nudgeParallax = useCallback((axis: 'yaw' | 'pitch', delta: number) => {
    setActiveParallax(prev => {
      const base = prev ?? currentSplat?.parallaxAmount ?? settings.parallaxAmount ?? DEFAULT_PARALLAX_AMOUNT;
      return {
        ...base,
        [axis]: Math.max(0, parseFloat((base[axis] + delta).toFixed(1))),
      };
    });
  }, [currentSplat?.parallaxAmount, settings.parallaxAmount]);

  // Navigate to different splat
  const goToSplat = useCallback((newIndex: number) => {
    showLoader();
    setControlMode(false);
    setCurrentIndex(newIndex);
  }, [showLoader]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!hasBooted) return;

      // Both modes: navigation + mode toggle
      if (e.key === 'ArrowRight') {
        goToSplat((currentIndex + 1) % splats.length);
      } else if (e.key === 'ArrowLeft') {
        goToSplat((currentIndex - 1 + splats.length) % splats.length);
      } else if (e.key === 'x' || e.key === 'X') {
        setControlMode(prev => !prev);
      } else if (controlMode) {
        // Edit mode only
        if (e.key === 'l' || e.key === 'L') {
          logCameraState();
        } else if (e.key === 'r' || e.key === 'R') {
          resetCamera();
        }
      }
    };

    // Double tap to change splat on mobile
    let lastTap = 0;
    let wasMultiTouch = false;

    const handleTouchStart = (e: TouchEvent) => {
      // Track if multiple fingers are used (panning gesture)
      if (e.touches.length > 1) {
        wasMultiTouch = true;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!hasBooted) return;

      // Ignore if other fingers are still down
      if (e.touches.length > 0) return;

      // Ignore if this was a multi-touch gesture (panning)
      if (wasMultiTouch) {
        wasMultiTouch = false;
        lastTap = 0;
        return;
      }

      const now = Date.now();
      const timeSinceLastTap = now - lastTap;

      // Require taps between 50ms and 250ms apart
      if (timeSinceLastTap > 50 && timeSinceLastTap < 250) {
        goToSplat((currentIndex + 1) % splats.length);
        lastTap = 0; // Reset to prevent triple-tap
      } else {
        lastTap = now;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    if (isMobile) {
      window.addEventListener('touchstart', handleTouchStart);
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (isMobile) {
        window.removeEventListener('touchstart', handleTouchStart);
        window.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [splats.length, hasBooted, currentIndex, goToSplat, logCameraState, resetCamera, controlMode, isMobile]);

  if (!currentSplat) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#111',
        color: '#ffb000',
        fontFamily: 'monospace'
      }}>
        NO SPLATS CONFIGURED
      </div>
    );
  }

  const splatUrl = `/splats/${currentSplat.splatFile}`;
  const splatFov = currentSplat.fov ?? settings.fov;

  // Effective parallax for display
  const effectiveParallax = activeParallax ?? currentSplat?.parallaxAmount ?? settings.parallaxAmount ?? DEFAULT_PARALLAX_AMOUNT;

  // Step 1: Boot animation (skipped during dev)
  // if (!hasBooted) {
  //   return (
  //     <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
  //       <CLILoader onReady={handleBootComplete} isMobile={isMobile} />
  //     </div>
  //   );
  // }

  // Step 2+: Show splat viewer (same for first and all subsequent splats)
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Application graphicsDeviceOptions={GRAPHICS_DEVICE_OPTIONS}>
        <SplatScene
          key={`${splatUrl}-${resetKey}`}
          splatUrl={splatUrl}
          fov={splatFov}
          cameraRef={cameraRef}
          onAssetLoaded={handleAssetLoaded}
        />
      </Application>

      {/* Loader while splat loads - starts visible, hidden when asset loads */}
      <CLIMiniLoader visible={loaderVisible} />

      {/* Info overlay - bottom left */}
      <CLIFrame
        style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          pointerEvents: 'none',
          minWidth: '260px',
          zIndex: 20,
        }}
      >
        <CLISection noBorderTop style={{ padding: '0.4rem 0.6rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
            {currentSplat.title.toUpperCase()}
          </span>
        </CLISection>
        {(currentSplat.town || currentSplat.coordinates) && (
          <CLISection style={{ padding: '0.4rem 0.6rem' }}>
            <div style={{ opacity: 0.7, fontSize: '0.7rem' }}>
              {currentSplat.town && <span>{currentSplat.town.toUpperCase()}</span>}
              {currentSplat.town && currentSplat.coordinates && ' '}
              {currentSplat.coordinates && (
                <a
                  href={`https://www.google.com/maps?q=${currentSplat.coordinates[0]},${currentSplat.coordinates[1]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'inherit', textDecoration: 'underline', pointerEvents: 'auto' }}
                >
                  {formatCoord(currentSplat.coordinates[0], currentSplat.coordinates[1])}
                </a>
              )}
            </div>
          </CLISection>
        )}
        {currentSplat.description && (
          <CLISection style={{ padding: '0.4rem 0.6rem' }}>
            <div style={{ opacity: 0.7, fontSize: '0.6rem', lineHeight: 1.4 }}>
              {currentSplat.description}
            </div>
          </CLISection>
        )}
        <CLISection style={{ padding: '0.4rem 0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', opacity: 0.5, fontSize: '0.65rem' }}>
            <span>[{currentIndex + 1}/{splats.length}]</span>
            {currentSplat.date && (
              <span>
                {new Date(currentSplat.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
              </span>
            )}
          </div>
        </CLISection>
      </CLIFrame>

      {/* Edit mode panel - bottom right */}
      {!isMobile && (
        <CLIFrame
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            pointerEvents: controlMode ? 'auto' : 'none',
            zIndex: 20,
            minWidth: controlMode ? '240px' : undefined,
          }}
        >
          {controlMode && liveValues ? (
            <>
              <CLISection noBorderTop label="fov" style={{ paddingTop: '0.6rem', paddingRight: '0.6rem', paddingBottom: '0.4rem', paddingLeft: '0.6rem' }}>
                <NudgeRow value={liveValues.fov} onMinus={() => nudgeFov(-1)} onPlus={() => nudgeFov(1)} />
              </CLISection>
              <CLISection label="position" style={{ paddingTop: '0.6rem', paddingRight: '0.6rem', paddingBottom: '0.4rem', paddingLeft: '0.6rem' }}>
                {(['x', 'y', 'z'] as const).map((axis, i) => (
                  <NudgeRow
                    key={axis}
                    label={axis.toUpperCase()}
                    value={liveValues.cameraPosition[i]}
                    onMinus={() => nudgePosition(axis, -0.05)}
                    onPlus={() => nudgePosition(axis, 0.05)}
                  />
                ))}
              </CLISection>
              <CLISection label="distance" style={{ paddingTop: '0.6rem', paddingRight: '0.6rem', paddingBottom: '0.4rem', paddingLeft: '0.6rem' }}>
                <NudgeRow value={liveValues.distance} onMinus={() => nudgeDistance(-0.1)} onPlus={() => nudgeDistance(0.1)} />
              </CLISection>
              <CLISection label="parallax" style={{ paddingTop: '0.6rem', paddingRight: '0.6rem', paddingBottom: '0.4rem', paddingLeft: '0.6rem' }}>
                <NudgeRow
                  label="Y"
                  value={effectiveParallax.yaw}
                  onMinus={() => nudgeParallax('yaw', -0.5)}
                  onPlus={() => nudgeParallax('yaw', 0.5)}
                />
                <NudgeRow
                  label="P"
                  value={effectiveParallax.pitch}
                  onMinus={() => nudgeParallax('pitch', -0.5)}
                  onPlus={() => nudgeParallax('pitch', 0.5)}
                />
              </CLISection>
              <CLISection label="config" style={{ paddingTop: '0.6rem', paddingRight: '0.6rem', paddingBottom: '0.4rem', paddingLeft: '0.6rem' }}>
                <pre style={{ fontSize: '0.55rem', opacity: 0.7, margin: 0, whiteSpace: 'pre-wrap' }}>
{JSON.stringify({
  fov: liveValues.fov,
  cameraPosition: liveValues.cameraPosition,
  focusPoint: liveValues.focusPoint,
  parallaxAmount: effectiveParallax,
}, null, 2)}
                </pre>
                <div style={{ marginTop: '0.3rem', textAlign: 'center' }}>
                  <CLIButton onClick={() => {
                    const json = JSON.stringify({
                      fov: liveValues.fov,
                      cameraPosition: liveValues.cameraPosition,
                      focusPoint: liveValues.focusPoint,
                      parallaxAmount: effectiveParallax,
                    }, null, 2);
                    navigator.clipboard.writeText(json);
                  }}>
                    COPY
                  </CLIButton>
                </div>
              </CLISection>
              <CLISection label="controls" style={{ paddingTop: '0.6rem', paddingRight: '0.6rem', paddingBottom: '0.4rem', paddingLeft: '0.6rem' }}>
                <div style={{ opacity: 0.5, fontSize: '0.55rem' }}>DRAG ORBIT | SHIFT+DRAG PAN</div>
                <div style={{ opacity: 0.5, fontSize: '0.55rem', marginTop: '0.15rem' }}>SCROLL ZOOM | [R] RESET | [L] LOG</div>
                <div style={{ opacity: 0.5, fontSize: '0.55rem', marginTop: '0.15rem' }}>[X] EXIT EDIT MODE</div>
              </CLISection>
            </>
          ) : (
            <CLISection noBorderTop style={{ padding: '0.4rem 0.6rem' }}>
              <div style={{ opacity: 0.5, fontSize: '0.6rem' }}>
                [+/-] OR SCROLL TO ZOOM
              </div>
              <div style={{ opacity: 0.5, fontSize: '0.6rem', marginTop: '0.15rem' }}>
                [&larr;/&rarr;] CHANGE PICTURE
              </div>
            </CLISection>
          )}
        </CLIFrame>
      )}

      {/* Tutorial overlay - first splat only */}
      {tutorialVisible && currentIndex === 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 20,
          }}
        >
          <CLIFrame>
            <CLISection
              noBorderTop
              style={{
                padding: '0.5rem 1rem',
                animation: tutorialDismissing ? 'terminalBlink 1.5s steps(1) forwards' : undefined,
              }}
            >
              <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                {isMobile ? 'SWIPE TO EXPERIENCE IN 3D' : 'MOVE THE MOUSE TO EXPERIENCE IN 3D | ARROW KEYS TO CHANGE'}
              </div>
            </CLISection>
          </CLIFrame>
        </div>
      )}

      <style>{`
        @keyframes terminalBlink {
          0% { opacity: 1; }
          10% { opacity: 0; }
          20% { opacity: 1; }
          30% { opacity: 0; }
          40% { opacity: 1; }
          50% { opacity: 0; }
          60% { opacity: 0.8; }
          70% { opacity: 0; }
          80% { opacity: 0.5; }
          90% { opacity: 0; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
