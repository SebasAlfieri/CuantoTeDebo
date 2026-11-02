import type { MetadataRoute } from 'next';

const manifest = (): MetadataRoute.Manifest => ({
  name: '¿Cuánto Te Debo?',
  short_name: 'Cuánto Te Debo',
  description: 'Dividí los gastos del grupo y mirá quién le paga a quién',
  lang: 'es',
  start_url: '/',
  display: 'standalone',
  background_color: '#f1efe9',
  theme_color: '#1d4fd6',
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    {
      src: '/icons/icon-maskable-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable'
    }
  ]
});

export default manifest;
