import { useEffect, useRef } from 'react';
import { Vec3, type Entity as PCEntity } from 'playcanvas';
import type { ParallaxAmount } from '@/lib/types';

const DEG = Math.PI / 180;
const SMOOTH_SPEED = 8; // exponential decay rate (~87ms half-life)

export function useParallax(
  cameraRef: React.MutableRefObject<PCEntity | null>,
  focusPoint: [number, number, number],
  cameraPosition: [number, number, number],
  parallaxAmount: ParallaxAmount,
  enabled: boolean,
) {
  // Store mouse position in ref to avoid re-renders
  const mouseRef = useRef({ x: 0, y: 0 });
  const currentOffset = useRef({ yaw: 0, pitch: 0 });
  const lastTime = useRef(0);
  const rafId = useRef(0);

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
  }, [focusPoint, cameraPosition]);

  // Mouse tracking
  useEffect(() => {
    if (!enabled) return;

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };

    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [enabled]);

  // When becoming enabled, initialize currentOffset from entity's actual position
  useEffect(() => {
    if (!enabled) return;

    const entity = cameraRef.current;
    if (!entity) return;

    const pos = entity.getPosition();
    const { yaw: restYaw, pitch: restPitch, distance } = initialRef.current;
    const focus = new Vec3(focusPoint[0], focusPoint[1], focusPoint[2]);

    // Compute current spherical offset relative to rest position
    const dx = pos.x - focus.x;
    const dy = pos.y - focus.y;
    const dz = pos.z - focus.z;
    const currentDist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (currentDist > 0.001 && distance > 0.001) {
      const currentPitch = Math.asin(Math.max(-1, Math.min(1, -dy / currentDist)));
      const currentYaw = Math.atan2(dx, dz);
      currentOffset.current.yaw = (currentYaw - restYaw) / DEG;
      currentOffset.current.pitch = (currentPitch - restPitch) / DEG;
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

      const { yaw: restYaw, pitch: restPitch, distance } = initialRef.current;

      // Target offsets in degrees
      const targetYaw = mouseRef.current.x * parallaxAmount.yaw;
      const targetPitch = mouseRef.current.y * parallaxAmount.pitch;

      // Exponential smoothing
      const t = 1 - Math.exp(-SMOOTH_SPEED * dt);
      currentOffset.current.yaw += (targetYaw - currentOffset.current.yaw) * t;
      currentOffset.current.pitch += (targetPitch - currentOffset.current.pitch) * t;

      // Compute camera position from orbit
      const yaw = restYaw + currentOffset.current.yaw * DEG;
      const pitch = restPitch + currentOffset.current.pitch * DEG;

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
        // CameraControls convention: angles.x = pitch (deg), angles.y = yaw (deg)
        poseAngles.x = -pitch / DEG;
        poseAngles.y = -yaw / DEG;
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
