import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Balsa Plane Site - Balsa Wood Glider CAD & Physics Laboratory',
  description: 'Design, balance, simulate, and laser-cut custom balsa wood gliders with real-time 3D Center of Gravity vs Neutral Point aerodynamics.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-950 text-slate-100 antialiased dark">
      <body className="h-full flex flex-col overflow-hidden">{children}</body>
    </html>
  );
}
