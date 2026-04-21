import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { useMemo } from 'react'
import { Routes, Route, BrowserRouter, Navigate } from "react-router-dom"
import { useParams } from 'react-router-dom'
import './index.css';
import App from './routes/App.tsx';
import OthelloRoom from './routes/OthelloRoom.tsx';

function RoomConnectionRoute() {
  const { roomCode } = useParams()

  const normalizedRoomCode = useMemo(() => {
    return (roomCode ?? '').toUpperCase()
  }, [roomCode])

  const hasValidCharacters = /^[A-Z0-9]+$/.test(normalizedRoomCode)

  if (!normalizedRoomCode || !hasValidCharacters) {
    console.log('invalid code redirecting');
    return <Navigate to='/' replace />
  }

  return <OthelloRoom code={normalizedRoomCode}/> 
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>

        <Route path='/' element={<App/>} />
        <Route path='/:roomCode' element={<RoomConnectionRoute />} />


      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
