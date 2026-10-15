'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import cs from 'classnames';

import {
  addExpense,
  addParticipant,
  getRoom,
  removeExpense,
  removeParticipant,
  setPaymentInfo
} from '@/lib/rooms';
import type { Room as RoomData } from '@/types/room';

import BackLink from '../BackLink';
import Button from '../Button';
import SplitEditor, { type SplitEditorActions } from '../SplitEditor';
import s from './Room.module.css';

type LoadStatus = 'loading' | 'ready' | 'not-found' | 'error';

interface RoomProps {
  roomId: string;
}

const COPIED_FEEDBACK_MS = 2000;

const Room = ({ roomId }: RoomProps) => {
  const [room, setRoom] = useState<RoomData | null>(null);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadRoom = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsRefreshing(true);

    try {
      const data = await getRoom(roomId);
      if (requestId !== requestIdRef.current) return;
      setRoom(data);
      setStatus(data ? 'ready' : 'not-found');
      setNotice(null);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error('No se pudo cargar la sala', err);
      setStatus((prev) => (prev === 'ready' ? prev : 'error'));
      setNotice('No se pudo actualizar la sala. Revisá tu conexión.');
    } finally {
      if (requestId === requestIdRef.current) setIsRefreshing(false);
    }
  }, [roomId]);

  // Invalida cargas en curso para que no pisen una actualización local más nueva.
  const cancelPendingLoads = () => {
    requestIdRef.current++;
    setIsRefreshing(false);
  };

  useEffect(() => {
    setShareUrl(`${window.location.origin}/sala/${roomId}`);
    setCanNativeShare(typeof navigator.share === 'function');
    void loadRoom();
  }, [roomId, loadRoom]);

  // Sin listeners en tiempo real: se refresca al volver a la pestaña (1 lectura).
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void loadRoom();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [loadRoom]);

  useEffect(() => {
    if (!isCopied) return;
    const timer = setTimeout(() => setIsCopied(false), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [isCopied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
    } catch {
      setNotice('No se pudo copiar. Copiá el link manualmente.');
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: room?.name ?? '¿Cuánto Te Debo?',
        text: `Sumate a "${room?.name ?? 'la sala'}" y cargá lo que gastaste`,
        url: shareUrl
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      void handleCopy();
    }
  };

  if (status === 'loading') {
    return (
      <div className={s.container}>
        <div className={s.skeleton} role="status" aria-label="Cargando sala">
          <span className={s.skeleton__title} />
          <span className={s.skeleton__card} />
          <span className={s.skeleton__card} />
        </div>
      </div>
    );
  }

  if (status === 'not-found' || status === 'error' || !room) {
    return (
      <div className={cs(s.container, s['container--center'])}>
        <p className={s.hero__eyebrow}>¿Cuánto Te Debo?</p>
        <h1 className={s.hero__title}>
          {status === 'error' ? 'Algo falló' : 'Sala no encontrada'}
        </h1>
        <p className={s.container__status} role="alert">
          {status === 'error'
            ? 'No se pudo cargar la sala. Revisá tu conexión.'
            : 'Esta sala no existe o el link está incompleto.'}
        </p>
        {status === 'error' && <Button onClick={() => void loadRoom()}>Reintentar</Button>}
        <BackLink label="Ir al inicio" />
      </div>
    );
  }

  // Cada acción guarda en Firestore y después actualiza el estado local.
  const actions: SplitEditorActions = {
    addPerson: async (name) => {
      cancelPendingLoads();
      const participant = await addParticipant(room, name);
      setRoom((prev) =>
        prev ? { ...prev, participants: [...prev.participants, participant] } : prev
      );
      return participant;
    },
    removePerson: async (participant) => {
      cancelPendingLoads();
      await removeParticipant(room, participant);
      setRoom((prev) =>
        prev
          ? {
              ...prev,
              participants: prev.participants.filter((p) => p.id !== participant.id),
              expenses: prev.expenses.filter((e) => e.participantId !== participant.id)
            }
          : prev
      );
    },
    addExpense: async (participantId, amount, description) => {
      cancelPendingLoads();
      const expense = await addExpense(room.id, participantId, amount, description);
      setRoom((prev) => (prev ? { ...prev, expenses: [...prev.expenses, expense] } : prev));
    },
    removeExpense: async (expense) => {
      cancelPendingLoads();
      await removeExpense(room.id, expense);
      setRoom((prev) =>
        prev ? { ...prev, expenses: prev.expenses.filter((e) => e.id !== expense.id) } : prev
      );
    },
    setPaymentInfo: async (participant, value) => {
      cancelPendingLoads();
      const paymentInfo = await setPaymentInfo(room.id, participant.id, value);
      setRoom((prev) =>
        prev
          ? {
              ...prev,
              participants: prev.participants.map((p) =>
                p.id === participant.id ? { ...p, paymentInfo } : p
              )
            }
          : prev
      );
    }
  };

  return (
    <SplitEditor
      eyebrow="Sala compartida"
      title={room.name}
      participants={room.participants}
      expenses={room.expenses}
      actions={actions}
      storageScope={room.id}
      intro={
        <>
          <section className={s.share} aria-label="Invitar amigos">
            <p className={s.share__text}>
              Compartí el link: cualquiera puede sumar personas y cargar gastos.
            </p>
            <div className={s.share__row}>
              <output className={s.share__url} title={shareUrl}>
                {shareUrl.replace(/^https?:\/\//, '')}
              </output>
              <Button
                size="sm"
                variant={isCopied ? 'light' : 'primary'}
                onClick={() => void handleCopy()}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={isCopied ? 'copied' : 'copy'}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}>
                    {isCopied ? '✓ Copiado' : 'Copiar'}
                  </motion.span>
                </AnimatePresence>
              </Button>
              {canNativeShare && (
                <Button size="sm" variant="ghost" onClick={() => void handleShare()}>
                  Compartir
                </Button>
              )}
            </div>
          </section>
          <AnimatePresence>
            {notice && (
              <motion.p
                className={s.container__error}
                role="alert"
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 14 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}>
                {notice}
              </motion.p>
            )}
          </AnimatePresence>
        </>
      }
      expensesAction={
        <button
          type="button"
          className={s.refresh}
          onClick={() => void loadRoom()}
          disabled={isRefreshing}
          aria-busy={isRefreshing}
          aria-label="Actualizar la sala">
          <motion.span
            className={s.refresh__icon}
            aria-hidden="true"
            animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
            transition={
              isRefreshing ? { repeat: Infinity, duration: 0.8, ease: 'linear' } : { duration: 0 }
            }>
            ↻
          </motion.span>
          Actualizar
        </button>
      }
    />
  );
};

export default Room;
