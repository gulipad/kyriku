import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kyriku',
  description: 'Una exploración 3D de los proyectos de Fundación Kyriku.',
  openGraph: {
    title: 'Kyriku',
    description: 'Una exploración 3D de los proyectos de Fundación Kyriku.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
