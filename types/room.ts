export interface Participant {
  id: string;
  name: string;
  color: string;
  // CBU, CVU o alias. Se guarda aparte, en el mapa `payments` de la sala.
  paymentInfo?: string;
}

export interface Expense {
  id: string;
  participantId: string;
  description: string;
  amount: number;
  createdAt: number;
}

export interface Room {
  id: string;
  name: string;
  participants: Participant[];
  expenses: Expense[];
}

export interface ParticipantBalance extends Participant {
  amount: number;
}
