import { useNavigate, useSearchParams } from 'react-router-dom'
import { buttonStyle } from './App'

function GameWin() {
	const tsGradient = '0 0 2px rgba(255,255,255,0.9), 0 0 6px rgba(255,255,255,0.7), 0 0 12px rgba(255,255,255,0.5), 0 0 24px rgba(255,255,255,0.3), 0 0 40px rgba(255,255,255,0.15)'
	const nav = useNavigate()
	const [searchParams] = useSearchParams()
	const myScore = Number.parseInt(searchParams.get('my') ?? '', 10)
	const opponentScore = Number.parseInt(searchParams.get('opp') ?? '', 10)
	const scoreText = Number.isNaN(myScore) || Number.isNaN(opponentScore)
		? '- - -'
		: ` ${myScore} - ${opponentScore}`

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
				🏆 WIN 🏆
			</h1>

			<p
				style={{
					fontFamily: 'main-bold',
					color: 'white',
					fontSize: '28px',
				}}
			>
				{scoreText}
			</p>

			<button
				type='button'
				onClick={() => nav('/')}
				style={{
					...buttonStyle,
					backgroundColor: 'ForestGreen'
				}}
			>
				return home
			</button>
		</div>
	)
}

export default GameWin;
