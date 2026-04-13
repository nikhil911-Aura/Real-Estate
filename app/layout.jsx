import './globals.css';
import Sidebar from '../components/Sidebar';

export const metadata = {
  title: 'Jenkins Homebuyers — Flip Detection Platform',
  description: 'Nashville/Tennessee real estate flip detection and opportunity scoring',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Sidebar />
        <main className="ml-64 min-h-screen p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
