function App () {


  const tsGradient = '0 0 2px rgba(255,255,255,0.9), 0 0 6px rgba(255,255,255,0.7), 0 0 12px rgba(255,255,255,0.5), 0 0 24px rgba(255,255,255,0.3), 0 0 40px rgba(255,255,255,0.15);'


  return (
    <>
      <div
        style={{
          width: '100vw',
          height: '100vw',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#656565',
          gap: '32px'
        }}
      >


        <h1 style={{fontFamily: "main-bold", color: 'white', textShadow: tsGradient }}>

          Uhthello

        </h1>








        
      </div>
    </>
  )



}

export default App;
