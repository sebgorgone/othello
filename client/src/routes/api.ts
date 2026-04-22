export type BoardPayload = {
	myMove: boolean
	validMoves: { x: number; y: number }[] | null
	squares: { x: number; y: number; value: 'w' | 'b' | null }[]
}

export type RoomListItem = {
	code: string
	playerCount: number
	expiresAt: number
}

//@ts-ignore
const svr = import.meta.env.VITE_SVR_URL;

export async function getBoard(game_id: string, socket_id: string) {
	const trimmedGameId = game_id.trim()
	const trimmedSocketId = socket_id.trim()

	if (!trimmedGameId || !trimmedSocketId) {
		throw new Error('game_id-or-socket_id-malformed')
	}

	if (!svr) {
		throw new Error('missing VITE_SVR_URL')
	}

	const params = new URLSearchParams({
		game_id: trimmedGameId,
		socket_id: trimmedSocketId,
	})

	const res = await fetch(`${svr}/board?${params.toString()}`, {
		method: 'GET',
	})

	if (!res.ok) {
		let serverError = ''

		try {
			const errJson = await res.json()
			if (typeof errJson?.error === 'string' && errJson.error.trim()) {
				serverError = errJson.error.trim()
			}
		} catch {
		}

		throw new Error(
			serverError ? `board-get-failed: ${serverError}` : `board-get-failed: ${res.status}`
		)
	}

	const data = (await res.json()) as { board: BoardPayload }

	return data.board
}

export async function getRoomList() {
	if (!svr) {
		throw new Error('missing VITE_SVR_URL')
	}

	const res = await fetch(`${svr}/rooms`, {
		method: 'GET',
	})

	if (!res.ok) {
		let serverError = ''

		try {
			const errJson = await res.json()
			if (typeof errJson?.error === 'string' && errJson.error.trim()) {
				serverError = errJson.error.trim()
			}
		} catch {
		}

		throw new Error(
			serverError ? `room-list-failed: ${serverError}` : `room-list-failed: ${res.status}`
		)
	}

	const data = (await res.json()) as { rooms: RoomListItem[] }

	return data.rooms
}