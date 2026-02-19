export type Player = {
    name: string;
    confirmed: boolean;
};
export interface ServerToClientEvents {
    assigned: (index: number) => void;
    playersUpdate: (players: {
        name: string;
        confirmed: boolean;
    }[]) => void;
    gameStarted: () => void;
}
export interface ClientToServerEvents {
    joinRoom: (roomId: string, config?: {
        create?: boolean;
        playerCount?: number;
        redDora?: boolean;
        ryukyoku?: boolean;
    }) => void;
    updateName: (index: number, name: string) => void;
    confirm: (index: number) => void;
    startGame: (roomId: string) => void;
}
//# sourceMappingURL=socket-events.d.ts.map