import { useEffect, useRef } from 'react';
import { Vec3, type Entity as PCEntity } from 'playcanvas';
import type { ParallaxAmount } from '@/lib/types';

const DEG = Math.PI / 180;
const SMOOTH_SPEED = 8; // exponential decay rate (~87ms half-life)
const INTRO_SMOOTH_SPEED = 2.5; // slower speed for intro reveal
const INTRO_DURATION = 1.2; // seconds to ramp from intro to normal speed
const INTRO_YAW = -5; // initial yaw offset in degrees
const INTRO_PITCH = -1.5; // initial pitch offset in degrees
const INTRO_ZOOM = 0.88; // initial distance multiplier (closer = more zoom)
const KEY_DOLLY_STEP = 0.25; // distance change per keypress, relative to initial distance
const SCROLL_DOLLY_STEP = 0.08; // scroll is less sensitive than keys
const DEFAULT_ZOOM_RANGE: [number, number] = [0.01, 1.5];

export function useParallax(
  cameraRef: React.MutableRefObject<PCEntity | null>,
  focusPoint: [number, number, number],
  cameraPosition: [number, number, number],
  parallaxAmount: ParallaxAmount,
  enabled: boolean,
  onMouseMove?: () => void,
  zoomRange?: [number, number],
) {
  // Store mouse position in ref to avoid re-renders
  const mouseRef = useRef({ x: 0, y: 0 });
  const currentOffset = useRef({ yaw: 0, pitch: 0 });
  const lastTime = useRef(0);
  const rafId = useRef(0);

  // Dolly zoom state
  const targetDistance = useRef(0);
  const currentDistance = useRef(0);

  // Track whether we've been enabled before (to distinguish initial mount from edit→view transition)
  const hasBeenEnabled = useRef(false);
  // Intro animation elapsed time (-1 = no intro active)
  const introElapsed = useRef(-1);

  // Compute initial spherical coords from cameraPosition → focusPoint
  const initialRef = useRef({ yaw: 0, pitch: 0, distance: 0 });

  useEffect(() => {
    const dx = focusPoint[0] - cameraPosition[0];
    const dy = focusPoint[1] - cameraPosition[1];
    const dz = focusPoint[2] - cameraPosition[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const pitch = Math.asin(dy / distance);
    const yaw = Math.atan2(-dx, -dz);

    initialRef.current = { yaw, pitch, distance };
    targetDistance.current = distance;
    currentDistance.current = distance;
    hasBeenEnabled.current = false;
  }, [focusPoint, cameraPosition]);

  // Stable callback ref for onMouseMove
  const onMouseMoveRef = useRef(onMouseMove);
  onMouseMoveRef.current = onMouseMove;

  // Mouse tracking
  useEffect(() => {
    if (!enabled) return;

    const onMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = (e.clientY / window.innerHeight) * 2 - 1;
      onMouseMoveRef.current?.();
    };

    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [enabled]);

  // +/- keys and scroll wheel for dolly zoom
  const zoomRangeRef = useRef(zoomRange ?? DEFAULT_ZOOM_RANGE);
  zoomRangeRef.current = zoomRange ?? DEFAULT_ZOOM_RANGE;

  useEffect(() => {
    if (!enabled) return;

    const dolly = (direction: number, stepScale: number) => {
      const step = initialRef.current.distance * stepScale;
      const [minMul, maxMul] = zoomRangeRef.current;
      const minDist = initialRef.current.distance * minMul;
      const maxDist = initialRef.current.distance * maxMul;
      if (direction < 0) {
        targetDistance.current = Math.max(minDist, targetDistance.current - step);
      } else {
        targetDistance.current = Math.min(maxDist, targetDistance.current + step);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === '=' || e.key === '+') dolly(-1, KEY_DOLLY_STEP);
      else if (e.key === '-' || e.key === '_') dolly(1, KEY_DOLLY_STEP);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      dolly(e.deltaY > 0 ? 1 : -1, SCROLL_DOLLY_STEP);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('wheel', onWheel);
    };
  }, [enabled]);

  // When becoming enabled, initialize currentOffset and distance
  useEffect(() => {
    if (!enabled) return;

    if (!hasBeenEnabled.current) {
      // First enable (initial load): start offset + zoomed in for intro reveal
      hasBeenEnabled.current = true;
      currentOffset.current.yaw = INTRO_YAW;
      currentOffset.current.pitch = INTRO_PITCH;
      currentDistance.current = initialRef.current.distance * INTRO_ZOOM;
      introElapsed.current = 0;
      lastTime.current = 0;
      return;
    }

    // Re-enable after edit mode: compute offset from entity's actual position
    const entity = cameraRef.current;
    if (!entity) return;

    const pos = entity.getPosition();
    const { yaw: restYaw, pitch: restPitch } = initialRef.current;
    const focus = new Vec3(focusPoint[0], focusPoint[1], focusPoint[2]);

    const dx = pos.x - focus.x;
    const dy = pos.y - focus.y;
    const dz = pos.z - focus.z;
    const currentDist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (currentDist > 0.001) {
      const currentPitch = Math.asin(Math.max(-1, Math.min(1, -dy / currentDist)));
      const currentYaw = Math.atan2(dx, dz);
      currentOffset.current.yaw = (currentYaw - restYaw) / DEG;
      currentOffset.current.pitch = (currentPitch - restPitch) / DEG;
      // Preserve distance from edit mode
      targetDistance.current = currentDist;
      currentDistance.current = currentDist;
    } else {
      currentOffset.current.yaw = 0;
      currentOffset.current.pitch = 0;
    }

    lastTime.current = 0;
  }, [enabled, cameraRef, focusPoint]);

  // Animation loop
  useEffect(() => {
    if (!enabled) {
      // Reset mouse to center when disabled so re-enable starts smooth
      mouseRef.current.x = 0;
      mouseRef.current.y = 0;
      return;
    }

    const focus = new Vec3(focusPoint[0], focusPoint[1], focusPoint[2]);

    const animate = (now: number) => {
      const entity = cameraRef.current;
      if (!entity) {
        rafId.current = requestAnimationFrame(animate);
        return;
      }

      // Compute dt
      const dt = lastTime.current ? Math.min((now - lastTime.current) / 1000, 0.1) : 0.016;
      lastTime.current = now;

      const { yaw: restYaw, pitch: restPitch } = initialRef.current;

      // Target offsets in degrees
      const targetYaw = mouseRef.current.x * parallaxAmount.yaw;
      const targetPitch = mouseRef.current.y * parallaxAmount.pitch;

      // Exponential smoothing (slower during intro reveal, ramps to normal)
      let speed = SMOOTH_SPEED;
      if (introElapsed.current >= 0) {
        introElapsed.current += dt;
        if (introElapsed.current >= INTRO_DURATION) {
          introElapsed.current = -1; // intro done
        } else {
          const progress = introElapsed.current / INTRO_DURATION;
          speed = INTRO_SMOOTH_SPEED + (SMOOTH_SPEED - INTRO_SMOOTH_SPEED) * progress;
        }
      }
      const t = 1 - Math.exp(-speed * dt);
      currentOffset.current.yaw += (targetYaw - currentOffset.current.yaw) * t;
      currentOffset.current.pitch += (targetPitch - currentOffset.current.pitch) * t;

      // Smooth distance toward target
      currentDistance.current += (targetDistance.current - currentDistance.current) * t;

      // Compute camera position from orbit
      const yaw = restYaw + currentOffset.current.yaw * DEG;
      const pitch = restPitch + currentOffset.current.pitch * DEG;
      const distance = currentDistance.current;

      const camX = focus.x + Math.sin(yaw) * Math.cos(pitch) * distance;
      const camY = focus.y - Math.sin(pitch) * distance;
      const camZ = focus.z + Math.cos(yaw) * Math.cos(pitch) * distance;

      entity.setPosition(camX, camY, camZ);
      entity.lookAt(focus);

      // Sync CameraControls _pose so edit mode transitions are seamless
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scripts = entity.script as any;
      const cc = scripts?.cameraControls;
      if (cc?._pose) {
        const poseAngles = cc._pose.angles;
        // CameraControls: direction = (-sin(yaw)*cos(pitch), sin(pitch), -cos(yaw)*cos(pitch))
        poseAngles.x = pitch / DEG;
        poseAngles.y = yaw / DEG;
        cc._pose.position.x = camX;
        cc._pose.position.y = camY;
        cc._pose.position.z = camZ;
        cc._pose.distance = distance;
      }

      rafId.current = requestAnimationFrame(animate);
    };

    rafId.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId.current);
    };
  }, [enabled, cameraRef, focusPoint, parallaxAmount]);
}
