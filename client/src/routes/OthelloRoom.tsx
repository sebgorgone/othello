import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { io, type Socket } from 'socket.io-client'

type Props = {
  code: string
}

const JOIN_TIMEOUT_MS = 6000

function OthelloRoom(props: Props) {




  const { code } = props
  const nav = useNavigate()
  const svr = import.meta.env.VITE_SVR_URL
  const [isRoomConnectionConfirmed, setIsRoomConnectionConfirmed] = useState(false)
  const hasNavigatedRef = useRef(false)
  const isRoomConnectionConfirmedRef = useRef(false)

  


  useEffect(() => {
    setIsRoomConnectionConfirmed(false)
    hasNavigatedRef.current = false
    isRoomConnectionConfirmedRef.current = false

    const navigateHome = (reason: string) => {
      console.error(`[room-connect] redirecting to /: ${reason} room=${code}`)

      if (hasNavigatedRef.current) {
        return
      }

      hasNavigatedRef.current = true
      nav('/', { replace: true })
    }

    if (!svr) {
      navigateHome('missing VITE_SVR_URL')
      return
    }

    const socket: Socket = io(svr, {
      query: { roomCode: code },
    })

    const timeoutId = window.setTimeout(() => {
      if (!isRoomConnectionConfirmedRef.current) {
        navigateHome(`join timeout after ${JOIN_TIMEOUT_MS}ms`)
      }
    }, JOIN_TIMEOUT_MS)

    socket.on('connect', () => {
      console.log(`[room-connect] socket connected id=${socket.id} room=${code}`)
    })

    socket.on('room-joined', (payload: { roomCode: string; playerCount: number; maxPlayers: number; expiresAt: number }) => {
      console.log('[room-connect] room joined', payload)
      isRoomConnectionConfirmedRef.current = true
      setIsRoomConnectionConfirmed(true)
      window.clearTimeout(timeoutId)
    })

    socket.on('room-error', (payload: { message: string; roomCode?: string }) => {
      navigateHome(`room-error: ${payload.message} room=${payload.roomCode ?? code}`)
    })

    socket.on('connect_error', (error) => {
      navigateHome(`connect_error: ${error.message}`)
    })

    return () => {
      window.clearTimeout(timeoutId)
      socket.off('connect')
      socket.off('room-joined')
      socket.off('room-error')
      socket.off('connect_error')
      socket.disconnect()
    }
  }, [code, nav, svr])






  
  return <>room: {code} {isRoomConnectionConfirmed ? '(connected)' : '(connecting...)'}</>
}

export default OthelloRoom;
