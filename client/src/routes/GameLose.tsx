function GameLose() {
	const tsGradient = '0 0 2px rgba(255,255,255,0.9), 0 0 6px rgba(255,255,255,0.7), 0 0 12px rgba(255,255,255,0.5), 0 0 24px rgba(255,255,255,0.3), 0 0 40px rgba(255,255,255,0.15)'

	return (
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
					fontFamily: 'main-bold',
					color: 'white',
					textShadow: tsGradient,
					fontSize: '38px',
				}}
			>
				😞 YOU LOSE 😞
			</h1>
		</div>
	)
}

export default GameLose;
