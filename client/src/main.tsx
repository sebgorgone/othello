import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { useMemo } from 'react'
import { Routes, Route, BrowserRouter, Navigate } from "react-router-dom"
import { useParams } from 'react-router-dom'
import './index.css';
import App from './routes/App.tsx';
import OthelloRoom from './routes/OthelloRoom.tsx';
import List from './routes/List.tsx'
import GameWin from './routes/GameWin.tsx';
import GameLose from './routes/GameLose.tsx';
import GameDraw from './routes/gameDraw.tsx';

function RoomConnectionRoute() {
  const { roomCode } = useParams()

  const normalizedRoomCode = useMemo(() => {
    return (roomCode ?? '').toUpperCase()
  }, [roomCode])

  const hasValidCharacters = /^[A-Z0-9]+$/.test(normalizedRoomCode)

  if (!normalizedRoomCode || !hasValidCharacters) {
    console.log('invalid code redirecting ' + roomCode);
    return <Navigate to='/' replace />
  }

  return <OthelloRoom code={normalizedRoomCode}/> 
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>

        <Route path='/' element={<App/>} />
        <Route path='/list' element={<List />} />
        <Route path='/win' element={<GameWin />} />
        <Route path='/lose' element={<GameLose />} />
        <Route path='/draw' element={<GameDraw />} />
        <Route path='/:roomCode' element={<RoomConnectionRoute />} />
        
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
