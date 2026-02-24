export type PublicPlayer = {
  name: string;
  confirmed: boolean;
};

export interface ServerToClientEvents {
  assigned: (index: number) => void;
  playersUpdate: (players: PublicPlayer[]) => void;
  gameStarted: () => void;
}

export interface ClientToServerEvents {
  joinRoom: (roomId: string) => void;
  updateName: (index: number, name: string) => void;
  confirm: (index: number) => void;
  startGame: (roomId: string) => void;
}
