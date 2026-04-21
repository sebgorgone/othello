import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
//import { useMemo } from 'react'
//import { Routes, Route, BrowserRouter, useNavigate } from "react-router-dom"
import { Routes, Route, BrowserRouter } from "react-router-dom"
//import { useParams } from 'react-router-dom'
import './index.css'
import App from './routes/App.tsx'

//function RoomConnectionRoute() {
//  const { roomCode } = useParams()
//
//  const normalizedRoomCode = useMemo(() => {
//    return (roomCode ?? '').toUpperCase()
//  }, [roomCode])
//
//  const hasValidCharacters = /^[A-Z0-9]+$/.test(normalizedRoomCode)
//
//  if (!normalizedRoomCode || !hasValidCharacters) {
//    return useNavigate('/')
//  }
//
//  return <>connecting</>
//}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>

        <Route path='/' element={<App/>} />
        {/*<Route path='/:roomCode' element={<RoomConnectionRoute />} />*/}

      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
