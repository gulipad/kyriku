import { Config } from '@/lib/types';
import SplatViewer from '@/components/SplatViewer';
import { promises as fs } from 'fs';
import path from 'path';

async function getConfig(): Promise<Config> {
  const configPath = path.join(process.cwd(), 'public/splats/config.json');
  try {
    const configFile = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(configFile);
  } catch {
    // Return default config if file doesn't exist
    return {
      splats: [],
      settings: {
        fov: 50,
      },
    };
  }
}

export default async function Home() {
  const config = await getConfig();

  return (
    <main style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <SplatViewer config={config} />
    </main>
  );
}
