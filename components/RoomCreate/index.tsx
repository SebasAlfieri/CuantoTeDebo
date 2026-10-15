'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import cs from 'classnames';

import { logger } from '@/lib/logger';
import { storePayerId } from '@/lib/room-storage';
import { createRoom, ROOM_NAME_MAX_LENGTH } from '@/lib/rooms';
import { normalizeName, PERSON_NAME_MAX_LENGTH } from '@/lib/split';

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
      <section
        className={cs(s.container, { [s['container--open']]: isOpen })}
        aria-labelledby="room-create-title">
        <button
          type="button"
          className={s.container__toggle}
          aria-expanded={isOpen}
          aria-controls="room-create-form"
          onClick={() => setIsOpen((prev) => !prev)}>
          <span className={s.container__icon} aria-hidden="true">
            👥
          </span>
          <span className={s.container__copy}>
            <span id="room-create-title" className={s.container__heading}>
              Crear sala compartida
            </span>
            <span className={s.container__caption}>Compartís un link y cada uno carga lo suyo</span>
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

                <button type="submit" className={s.container__submit} disabled={!canSubmit}>
                  {isSubmitting ? 'Creando…' : 'Crear sala y obtener link'}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </section>
    </MotionConfig>
  );
};

export default RoomCreate;
