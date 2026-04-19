import AppProviders from '@/components/providers/AppProviders';
import './globals.css';

export const metadata = {
  title: 'GeoSpatial Intelligence Dashboard',
  description: 'Geospatial analytics and collaboration dashboard built with Next.js.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
