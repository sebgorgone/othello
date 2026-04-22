import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import { getBoard, turn } from './api';
import type { BoardPayload } from './api';
import { buttonStyle } from './App.tsx'

type Props = {
  code: string;
};

const JOIN_TIMEOUT_MS = 6000;

function OthelloRoom(props: Props) {
  const { code } = props;
  const nav = useNavigate();
  //@ts-ignore
  const svr = import.meta.env.VITE_SVR_URL;

  const [isRoomConnectionConfirmed, setIsRoomConnectionConfirmed] = useState(false);
  const [board, setBoard] = useState<BoardPayload | null>(null);
  const boardRef = useRef<BoardPayload | null>(null);
  const hasNavigatedRef = useRef(false);
  const isRoomConnectionConfirmedRef = useRef(false);
  const socketIdRef = useRef('');

  console.log(board);




  useEffect(() => {
    let socket: Socket | null = null;

    const navigateHome = (reason: string) => {
      console.error(`[room-connect] redirecting to /: ${reason} room=${code}`);

      if (hasNavigatedRef.current) {
        return;
      }

      hasNavigatedRef.current = true;
      nav('/', { replace: true });
    };

    const navigateResult = (path: '/win' | '/lose' | '/draw') => {
      if (hasNavigatedRef.current) {
        return;
      }

      const currentBoard = boardRef.current;
      let myScore: number | null = null;
      let opponentScore: number | null = null;

      if (currentBoard) {
        const whiteScore = currentBoard.squares.filter((square) => square.value === 'w').length;
        const blackScore = currentBoard.squares.filter((square) => square.value === 'b').length;
        const mySocketId = socketIdRef.current;

        if (mySocketId && currentBoard.white === mySocketId) {
          myScore = whiteScore;
          opponentScore = blackScore;
        } else if (mySocketId && currentBoard.black === mySocketId) {
          myScore = blackScore;
          opponentScore = whiteScore;
        }
      }

      hasNavigatedRef.current = true;

      if (myScore === null || opponentScore === null) {
        nav(path, { replace: true });
        return;
      }

      const params = new URLSearchParams({
        my: String(myScore),
        opp: String(opponentScore),
      });

      nav(`${path}?${params.toString()}`, { replace: true });
    };

    if (!svr) {
      navigateHome('missing VITE_SVR_URL');
      return;
    }

    setIsRoomConnectionConfirmed(false);
    hasNavigatedRef.current = false;
    isRoomConnectionConfirmedRef.current = false;
    socketIdRef.current = '';
    boardRef.current = null;
    setBoard(null);

    socket = io(svr, {
      query: { roomCode: code },
    });

    const timeoutId = window.setTimeout(() => {
      if (!isRoomConnectionConfirmedRef.current) {
        navigateHome(`join timeout after ${JOIN_TIMEOUT_MS}ms`);
      }
    }, JOIN_TIMEOUT_MS);

    socket.on('connect', () => {
      console.log(`[room-connect] socket connected id=${socket?.id} room=${code}`);
      socketIdRef.current = socket?.id ?? '';
    });

    socket.on(
      'room-joined',
      async (payload: { roomCode: string; playerCount: number; maxPlayers: number; expiresAt: number }) => {
        console.log('[room-connect] room joined', payload);
        isRoomConnectionConfirmedRef.current = true;
        setIsRoomConnectionConfirmed(true);
        window.clearTimeout(timeoutId);
        socketIdRef.current = socket?.id ?? '';

        if (!socket?.id) {
          navigateHome('missing socket id after connect');
          return;
        }

        try {
          const result = await getBoard(code, socket.id);
          boardRef.current = result;
          setBoard(result);
        } catch (err) {
          console.error('[room-connect] getBoard failed', err);
          navigateHome('getBoard failed');
        }
      },
    );

    socket.on('refresh-board', async () => {
      if (!socket?.id) return;

      try {
        const result = await getBoard(code, socket.id);
        boardRef.current = result;
        setBoard(result);
      } catch (err) {
        console.error('[room-connect] refresh-board failed', err);
      }
    });

    socket.on('room-error', (payload: { message: string; roomCode?: string }) => {
      navigateHome(`room-error: ${payload.message} room=${payload.roomCode ?? code}`);
    });

    socket.on('connect_error', (error) => {
      navigateHome(`connect_error: ${error.message}`);
    });

    socket.on('game-win', () => {
      navigateResult('/win');
    });

    socket.on('game-lose', () => {
      navigateResult('/lose');
    });

    socket.on('game-tie', () => {
      navigateResult('/draw');
    });

    return () => {
      window.clearTimeout(timeoutId);
      socket?.off('connect');
      socket?.off('room-joined');
      socket?.off('refresh-board');
      socket?.off('room-error');
      socket?.off('connect_error');
      socket?.off('game-win');
      socket?.off('game-lose');
      socket?.off('game-tie');
      socket?.disconnect();
    };
  }, [code, nav, svr]);

  function getPlayersMove() {
    if (!board) return null;

    if (board.turnCount % 2 === 1) return 'white';

    return 'black';
  }

  function checkValidMove(x: number, y: number) {
    if (!board || !board.validMoves) return false;

    const foundMove = board.validMoves.filter((vm) => vm.x === x && vm.y === y);

    return foundMove.length !== 0;
  }

  async function handleTurn(x: number, y: number) {
    if (!board || !socketIdRef.current) return;

    try {
      await turn(socketIdRef.current, code, x, y);
    } catch (err) {
      console.error('[turn] failed', err);
    }
  }

  function buildBoard() {

    if (!board) return;

    return <>

      <div
        style={{
          width: 'min(100vw - 100px, 100vh - 136px)',
          aspectRatio: '1 / 1',
          display: 'grid',
          gridTemplate: 'repeat(8, 1fr) / repeat(8, 1fr)'
        }}
      >

        {board.squares.map((s, idx) => (
          <div
            key={`${s.x}-${s.y}-${idx}`}
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: (s.x + s.y) % 2 === 0 ? '#656055' : 'ForestGreen',
            }}
          >



            {s.value && 
              <img
                src={`${s.value === 'w' ? 'white' : 'black'}-chip.svg`}
                style={{
                  width: '85%',
                  height: '85%'
                }}
              />
            }

            {checkValidMove(s.x, s.y) &&
              <button
                type='button'
                onClick={() => void handleTurn(s.x, s.y)}
                className='valid-move'
                style={{ backgroundColor: '#9f9f9f' }}
              />
            }
          </div>
        ))}
      </div>
    </>;
  }


  function getConnectedNum() {
    if (!board) return;
    if (board.white && board.black) return '2 / 2';

    return '1 / 2';
  }

  function getPlayercolorIcon() {
    const mySocketId = socketIdRef.current;

    if (!board || !mySocketId) return null;

    if (mySocketId === board.white) return (
      <img 
        alt='white game piece'
        src='white-chip.svg'
        style={{
          width: '64px',
          aspectRatio: '1 / 1'
        }}

      />
    )

    if (mySocketId === board.black) return (
      <img 
        alt='black game piece'
        src='black-chip.svg'
        style={{
          width: '64px',
          aspectRatio: '1 / 1'
        }}

      />
    )

    return null;
  }

  return (
    <>
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#353025',
          flexDirection: 'column',
        }}
      >


        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '124px',
            justifyContent: 'space-between',
            padding: '8px',
            alignItems: 'center',
            flexDirection: 'column'
          }}
        >



          <div
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%'
            }}
          >

            <div
              style={{display: 'flex', flexDirection: 'column', gap: '14px'}}
            >

              <button
                style={{
                  ...buttonStyle,
                  backgroundColor: 'ForestGreen'
                }}
                type='button'
                onClick={() => nav('/')}
              >
                leave match
              </button>

              <p
                style={{
                  fontFamily: 'main-bold',
                  color: 'white',
                  fontSize: '20px',
                }}
              >
                room: {code} {isRoomConnectionConfirmed ? `(connected ${getConnectedNum()})` : '(connecting...)'}
              </p>

            </div>




            {getPlayercolorIcon()}





          </div>



          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginRight: '8px',
              width: '100%',
              padding: '12px',
              justifyContent: 'space-between'
            }}
          >

            <p
              style={{
                fontFamily: 'main-bold',
                color: 'white',
                fontSize: '20px',
              }}
            >
              {getPlayersMove()}{getPlayersMove() ? "'s turn" : ''}
            </p>

            {(board && board.myMove) && 
              <p
                style={{
                  fontFamily: 'main-bold',
                  color: 'white',
                  fontSize: '20px',
                }}
              >
                Your Move
              </p>}
          </div>
        </div>

        {buildBoard()}

      </div>
    </>
  );
}

export default OthelloRoom;
