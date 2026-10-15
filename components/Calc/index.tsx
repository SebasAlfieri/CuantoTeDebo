'use client';

import { useEffect, useState } from 'react';
import { saveAs } from 'file-saver';
import * as domtoimage from 'html-to-image';
import html2canvas from 'html2canvas';

import useIsMobile from '@/hooks/use-is-mobile';
import { logger } from '@/lib/logger';
import { loadSoloData, saveSoloData, type SoloData } from '@/lib/solo-storage';
import { createId, pickColor, PERSON_NAME_MAX_LENGTH } from '@/lib/split';
import type { Participant } from '@/types/room';

import Button from '../Button';
import SplitEditor, { type SplitEditorActions } from '../SplitEditor';
import s from './Calc.module.css';

const CAPTURE_ID = 'screenshot';
const CAPTURE_BACKGROUND = '#14171d';
const SHARE_FILE_NAME = 'CuantoDeben.png';

// Mientras se genera la imagen se ocultan los botones de copiar CBU/alias (ver SplitEditor.module.css).
const prepareCapture = async (element: HTMLElement): Promise<() => void> => {
  element.dataset.capturing = 'true';
  await new Promise((resolve) => requestAnimationFrame(resolve));
  return () => {
    delete element.dataset.capturing;
  };
};

const Calc = () => {
  const isMobile = useIsMobile();
  const [data, setData] = useState<SoloData | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    setData(loadSoloData());
  }, []);

  useEffect(() => {
    if (data) saveSoloData(data);
  }, [data]);

  const hasResult = (data?.participants.length ?? 0) >= 2;

  // Genera la imagen varias veces al inicio para evitar bugs de html-to-image con Safari Mac.
  useEffect(() => {
    if (isMobile || !hasResult) return;

    const element = document.getElementById(CAPTURE_ID);
    if (!element) return;

    let runs = 0;
    const interval = setInterval(() => {
      runs++;
      void domtoimage.toPng(element, { pixelRatio: 2 }).catch(() => undefined);
      if (runs >= 3) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [isMobile, hasResult]);

  const handleShare = async () => {
    const element = document.getElementById(CAPTURE_ID);
    if (!element) return;

    setIsSharing(true);
    const restore = await prepareCapture(element);

    try {
      if (isMobile) {
        // En celulares (Safari/iOS) html2canvas es más confiable.
        const canvas = await html2canvas(element, { backgroundColor: CAPTURE_BACKGROUND });
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve));
        if (!blob) throw new Error('No se pudo crear la imagen');

        const files = [new File([blob], SHARE_FILE_NAME, { type: 'image/png' })];
        if (navigator.userActivation?.isActive && navigator.canShare?.({ files })) {
          await navigator.share({ files });
        } else {
          window.open(URL.createObjectURL(blob), '_blank');
        }
      } else {
        const dataUrl = await domtoimage.toPng(element, {
          pixelRatio: 2,
          backgroundColor: CAPTURE_BACKGROUND
        });
        saveAs(dataUrl, SHARE_FILE_NAME);
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        logger.error('No se pudo compartir el resultado', err);
      }
    } finally {
      restore();
      setIsSharing(false);
    }
  };

  if (!data) return null;

  // Todo se guarda en el estado local; el efecto de arriba lo persiste en el navegador.
  const actions: SplitEditorActions = {
    addPerson: async (name) => {
      const participant: Participant = {
        id: createId(),
        name: name.slice(0, PERSON_NAME_MAX_LENGTH),
        color: pickColor(data.participants.map((p) => p.color))
      };
      setData((prev) =>
        prev ? { ...prev, participants: [...prev.participants, participant] } : prev
      );
      return participant;
    },
    removePerson: async (participant) => {
      setData((prev) =>
        prev
          ? {
              participants: prev.participants.filter((p) => p.id !== participant.id),
              expenses: prev.expenses.filter((e) => e.participantId !== participant.id)
            }
          : prev
      );
    },
    addExpense: async (participantId, amount, description) => {
      const expense = { id: createId(), participantId, description, amount, createdAt: Date.now() };
      setData((prev) => (prev ? { ...prev, expenses: [...prev.expenses, expense] } : prev));
    },
    removeExpense: async (expense) => {
      setData((prev) =>
        prev ? { ...prev, expenses: prev.expenses.filter((e) => e.id !== expense.id) } : prev
      );
    },
    setPaymentInfo: async (participant, value) => {
      setData((prev) =>
        prev
          ? {
              ...prev,
              participants: prev.participants.map((p) =>
                p.id === participant.id ? { ...p, paymentInfo: value || undefined } : p
              )
            }
          : prev
      );
    }
  };

  return (
    <SplitEditor
      eyebrow="Cargar yo solo"
      title="¿Cuánto Te Debo?"
      participants={data.participants}
      expenses={data.expenses}
      actions={actions}
      storageScope="solo"
      intro={
        <p className={s.intro}>
          📱 Todo se guarda en este dispositivo. Cargá a cada persona y lo que puso.
        </p>
      }
      resultCaptureId={CAPTURE_ID}
      resultActions={
        <Button variant="light" block onClick={() => void handleShare()} disabled={isSharing}>
          {isSharing ? 'Generando imagen…' : 'Compartir resultado'}
        </Button>
      }
    />
  );
};

export default Calc;
