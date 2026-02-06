'use client';

import dynamic from 'next/dynamic';
import type { Config } from '@/lib/types';

// Dynamic import with no SSR since PlayCanvas needs browser APIs
const SplatViewerComponent = dynamic(() => import('./SplatViewer'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
      }}
    />
  ),
});

interface SplatViewerProps {
  config: Config;
}

export default function SplatViewer({ config }: SplatViewerProps) {
  return <SplatViewerComponent config={config} />;
}
