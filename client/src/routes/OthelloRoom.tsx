import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import { getBoard } from './api';
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
  const [socketId, setSocketId] = useState<string>('');
  const [board, setBoard] = useState<BoardPayload | null>(null);
  const hasNavigatedRef = useRef(false);
  const isRoomConnectionConfirmedRef = useRef(false);


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

    if (!svr) {
      navigateHome('missing VITE_SVR_URL');
      return;
    }

    setIsRoomConnectionConfirmed(false);
    hasNavigatedRef.current = false;
    isRoomConnectionConfirmedRef.current = false;
    setSocketId('');
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
      setSocketId(socket?.id ?? '');
    });

    socket.on(
      'room-joined',
      async (payload: { roomCode: string; playerCount: number; maxPlayers: number; expiresAt: number }) => {
        console.log('[room-connect] room joined', payload);
        isRoomConnectionConfirmedRef.current = true;
        setIsRoomConnectionConfirmed(true);
        window.clearTimeout(timeoutId);

        if (!socket?.id) {
          navigateHome('missing socket id after connect');
          return;
        }

        try {
          const result = await getBoard(code, socket.id);
          setBoard(result);
        } catch (err) {
          console.error('[room-connect] getBoard failed', err);
          navigateHome('getBoard failed');
        }
      },
    );

    socket.on('room-error', (payload: { message: string; roomCode?: string }) => {
      navigateHome(`room-error: ${payload.message} room=${payload.roomCode ?? code}`);
    });

    socket.on('connect_error', (error) => {
      navigateHome(`connect_error: ${error.message}`);
    });

    return () => {
      window.clearTimeout(timeoutId);
      socket?.off('connect');
      socket?.off('room-joined');
      socket?.off('room-error');
      socket?.off('connect_error');
      socket?.disconnect();
    };
  }, [code, nav, svr]);






  //room: {code} {isRoomConnectionConfirmed ? '(connected)' : '(connecting...)'}


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
            height: '86px',
            justifyContent: 'space-between',
            padding: '8px',
            alignItems: 'center',
          }}
        >



          <div
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center'
            }}
          >


            <button
              style={{
                ...buttonStyle ,
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

              room: {code} {isRoomConnectionConfirmed ? '(connected)' : '(connecting...)'}

            </p>



          </div>



          <div
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center'
            }}
          >

          </div>





        </div>





      </div>
    </>
  );
}

export default OthelloRoom;
