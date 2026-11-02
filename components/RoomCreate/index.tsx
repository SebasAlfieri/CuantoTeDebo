'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';

import { logger } from '@/lib/logger';
import { storePayerId } from '@/lib/room-storage';
import { createRoom, ROOM_NAME_MAX_LENGTH } from '@/lib/rooms';
import { normalizeName, PERSON_NAME_MAX_LENGTH } from '@/lib/split';

import Button from '../Button';
import s from './RoomCreate.module.css';

const RoomCreate = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [personName, setPersonName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    normalizeName(roomName).length > 0 && normalizeName(personName).length > 0 && !isSubmitting;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { roomId, participantId } = await createRoom(roomName, personName);
      storePayerId(roomId, participantId);
      router.push(`/sala/${roomId}`);
    } catch (err) {
      logger.error('No se pudo crear la sala', err);
      setError('No se pudo crear la sala. Probá de nuevo.');
      setIsSubmitting(false);
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <section className={s.container} aria-labelledby="room-create-title">
        <button
          type="button"
          className={s.container__toggle}
          aria-expanded={isOpen}
          aria-controls="room-create-form"
          onClick={() => setIsOpen((prev) => !prev)}>
          <span className={s.container__icon} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="9" cy="8" r="3.2" />
              <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
              <circle cx="17" cy="9" r="2.6" />
              <path d="M16 14.2a4.6 4.6 0 0 1 5 4.8" />
            </svg>
          </span>
          <span className={s.container__copy}>
            <span id="room-create-title" className={s.container__heading}>
              Crear sala compartida
            </span>
            <span className={s.container__caption}>Mandás un link y cada uno carga lo suyo</span>
          </span>
          <motion.span
            className={s.container__chevron}
            aria-hidden="true"
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
            +
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.form
              id="room-create-form"
              className={s.container__form}
              onSubmit={handleSubmit}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
              <div className={s.container__fields}>
                <p className={s.container__hint}>
                  Se genera un link: cualquiera que lo abra puede sumar personas y cargar gastos.
                </p>

                <label className={s.container__field}>
                  <span>Nombre de la sala</span>
                  <input
                    type="text"
                    placeholder="Asado del sábado"
                    value={roomName}
                    maxLength={ROOM_NAME_MAX_LENGTH}
                    onChange={(e) => setRoomName(e.target.value)}
                  />
                </label>

                <label className={s.container__field}>
                  <span>Tu nombre</span>
                  <input
                    type="text"
                    placeholder="Nombre"
                    value={personName}
                    maxLength={PERSON_NAME_MAX_LENGTH}
                    autoComplete="given-name"
                    onChange={(e) => setPersonName(e.target.value)}
                  />
                </label>

                {error && (
                  <p className={s.container__error} role="alert">
                    {error}
                  </p>
                )}

                <Button type="submit" block disabled={!canSubmit}>
                  {isSubmitting ? 'Creando…' : 'Crear sala y obtener link'}
                </Button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </section>
    </MotionConfig>
  );
};

export default RoomCreate;
