import { useNavigate } from 'react-router-dom'
export const bsGradient = '0 0 12px rgba(255,255,255,0.5), 0 0 24px rgba(255,255,255,0.3), 0 0 40px rgba(255,255,255,0.15)'
export const buttonStyle = {
  border: 'none',
  padding: '8px',
  backgroundColor: 'green',
  fontFamily: 'main-bold',
  color: '#111111',
  borderRadius: '3px',
  boxShadow: bsGradient,
  fontSize: '17px'
}

function App() {

  const nav = useNavigate();
  const svr = import.meta.env.VITE_SVR_URL
  const tsGradient = '0 0 2px rgba(255,255,255,0.9), 0 0 6px rgba(255,255,255,0.7), 0 0 12px rgba(255,255,255,0.5), 0 0 24px rgba(255,255,255,0.3), 0 0 40px rgba(255,255,255,0.15)'




  async function createRoomHandler() {


    try {
      const res = await fetch(`${svr}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
      });

      if (!res.ok) {
        throw new Error('bad http request: ' + res.status);
      }

      const room = await res.json();
      console.log(room);

      nav(`/${room.roomCode}`)
    } catch (err) {
      console.error('POST req to /rooms failed: ' + err);
      throw err;
    }
  }

  function roomListHandler() {
    nav('/list')
  }


  return (
    <>
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#353025',
          gap: '48px',
          color: '#000000'
        }}
      >


        <h1
          style={{
            fontFamily: "main-bold",
            color: 'white',
            textShadow: tsGradient,
            fontSize: '38px',
          }}
        >

          Uhthello

        </h1>

        <a
          style={{
            fontSize: '1.3em',
            fontWeight: 'bold',
            color: 'green'
          }}
          target='_blank'
          href='https://www.worldothello.org/about/about-othello/othello-rules/official-rules/'>
          Official Othello Game Rules
        </a>


        <button
          type='button'
          onClick={createRoomHandler}
          style={{
            ...buttonStyle, backgroundColor: 'green'
          }}
        >

          start a new game

        </button>

        <button
          type='button'
          onClick={roomListHandler}
          style={{
            ...buttonStyle,
            backgroundColor: 'ForestGreen'
          }}
        >

          Join Game

        </button>




      </div>
    </>
  )



}

export default App;
