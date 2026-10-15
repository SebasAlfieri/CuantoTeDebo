import type { Metadata } from 'next';

import { Room } from '@/components';

import s from './page.module.css';

interface RoomPageProps {
  params: Promise<{ roomId: string }>;
}

export const metadata: Metadata = {
  title: 'Sala compartida | ¿Cuánto Te Debo?',
  description: 'Cargá lo que gastaste y mirá cuánto le debés a cada uno',
  robots: { index: false, follow: false }
};

const RoomPage = async ({ params }: RoomPageProps) => {
  const { roomId } = await params;

  return (
    <main className={s.container}>
      <Room key={roomId} roomId={roomId} />
    </main>
  );
};

export default RoomPage;
