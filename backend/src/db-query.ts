import db from './db-connect.js'

type BoardPayload = {
  myMove: boolean,
  validMoves: {x: number, y: number}[] | null,
  squares: {x: number, y: number, value: 'w' | 'b' | null}[],
  white: string | null,
  black: string | null,
  turnCount: number | null,
  gameOver: boolean,
  winner: 'b' | 'w' | 'tie' | null
}

type DbQueryErrorCode =
  | "invalid-args"
  | "game-not-found"
  | "board-corrupt";

class DbQueryError extends Error {
  constructor(
    public readonly code: DbQueryErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DbQueryError";
  }
}

type GameRow = {
  id: string;
  b: string | null;
  w: string | null;
  turnCount: number;
};

type SquareRow = {
  x: number;
  y: number;
  value: "w" | "b" | null;
};

function evaluateGameOutcome(squares: {x: number, y: number, value: 'w' | 'b' | null}[]) {
  const hasEmptySquare = squares.some((square) => square.value === null);
  const blackValidMoves = getValidMoves('black', squares).length;
  const whiteValidMoves = getValidMoves('white', squares).length;
  const gameOver = !hasEmptySquare || (blackValidMoves === 0 && whiteValidMoves === 0);

  if (!gameOver) {
    return { gameOver: false, winner: null as 'b' | 'w' | 'tie' | null };
  }

  let blackCount = 0;
  let whiteCount = 0;

  for (const square of squares) {
    if (square.value === 'b') {
      blackCount += 1;
      continue;
    }

    if (square.value === 'w') {
      whiteCount += 1;
    }
  }

  if (blackCount > whiteCount) {
    return { gameOver: true, winner: 'b' as const };
  }

  if (whiteCount > blackCount) {
    return { gameOver: true, winner: 'w' as const };
  }

  return { gameOver: true, winner: 'tie' as const };
}

export function gameTruncate() {
  db.prepare('DELETE FROM games').run()
}


function getValidMoves(
  playersTurn: 'white' | 'black', 
  squares: {x: number, y: number, value: 'w' | 'b' | null}[] ) {
  const enemyColor = playersTurn === 'white' ? 'b' : 'w';
  const myColor = playersTurn === 'white' ? 'w' : 'b';
  const validMoves = new Map<string, {x: number, y: number}>();
  const board = new Map<string, 'w' | 'b' | null>();
  const directions = [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const;
  const inBounds = (x: number, y: number) => x >= 0 && x < 8 && y >= 0 && y < 8;
  const coord = (x: number, y: number) => `${x},${y}`;

  for (const square of squares) {
    board.set(coord(square.x, square.y), square.value);
  }

  for (let chip of squares) {
   if (chip.value !== enemyColor) {
     continue;
   }

   //checking surrounding squares for open spots 
   for (let direction of directions) {
     const [dx, dy] = direction;
     const adjacentX = chip.x + dx;
     const adjacentY = chip.y + dy;
     
     if (!inBounds(adjacentX, adjacentY)) {
       continue;
     }

     const adjacentSquare = board.get(coord(adjacentX, adjacentY));
     
     if (adjacentSquare === null) {
      //check in all 8 directions to check for mycolor chips before the edge of the board bounds
      for (const [scanDx, scanDy] of directions) {
         let x = adjacentX + scanDx;
         let y = adjacentY + scanDy;
         let sawEnemy = false;

         //itterate multiplying dx and dy 
         while (inBounds(x, y)) {
           const currentSquare = board.get(coord(x, y));

           //if it is another empty square end the loop and check the next direction 
           if (currentSquare === null || currentSquare === undefined) {
             break;
           }

           if (currentSquare === enemyColor) {
             sawEnemy = true;
             x += scanDx;
             y += scanDy;
             continue;
           }

           //if out of bounds is reached end the loop and go to the next direction
           //if a friendly chip is found end the loop (dont check any more directions) and add that x and y to the valid moves
           if (currentSquare === myColor && sawEnemy) {
             validMoves.set(coord(adjacentX, adjacentY), { x: adjacentX, y: adjacentY });
           }

           break;
         }

         if (validMoves.has(coord(adjacentX, adjacentY))) {
           break;
         }
      } 
     }
   }
  }

  return Array.from(validMoves.values());
}


export function gameCreate(game_id: string) {
  const transaction = db.transaction(() => {
    db.prepare('INSERT INTO games (id) VALUES (?)').run(game_id);
    const squares: {x: number, y: number, value: 'w' | 'b' | null}[] = []

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (i === 3 && j === 3) {
          db.prepare('INSERT INTO squares (game_id, x, y, value) VALUES (?, ?, ?, ?)').run(game_id, i, j, 'w');
          squares.push({x: i, y: j, value: 'w'});
        } else if (i === 3 && j === 4) {
          db.prepare('INSERT INTO squares (game_id, x, y, value) VALUES (?, ?, ?, ?)').run(game_id, i, j, 'b');
          squares.push({x: i, y: j, value: 'b'});
        } else if (i === 4 && j === 3) {
          db.prepare('INSERT INTO squares (game_id, x, y, value) VALUES (?, ?, ?, ?)').run(game_id, i, j, 'b');
          squares.push({x: i, y: j, value: 'b'});
        } else if (i === 4 && j === 4) {
          db.prepare('INSERT INTO squares (game_id, x, y, value) VALUES (?, ?, ?, ?)').run(game_id, i, j, 'w');
          squares.push({x: i, y: j, value: 'w'});
        } else {
          db.prepare('INSERT INTO squares (game_id, x, y) VALUES (?, ?, ?)').run(game_id, i, j);
          squares.push({x: i, y: j, value: null});
        }
      }
    }

    const validMoves = getValidMoves('black', squares);
    for (let move of validMoves) {
      db.prepare('INSERT INTO bValidMoves (game_id, x, y) VALUES (?, ?, ?)').run(game_id, move.x, move.y);
    }
  });

  transaction();
}


export function gameDelete(game_id: string) {
  db.prepare('DELETE FROM games WHERE id = ?').run(game_id)
}




export function turn(game_id: string, x: number, y: number, socket_id: string): boolean {
  const cleanGameId = String(game_id ?? '').trim();
  const cleanSocketId = String(socket_id ?? '').trim();

  if (!cleanGameId || cleanGameId.length !== 6) {
    throw new Error('game_id malformed or missing');
  }

  if (!cleanSocketId) {
    throw new Error('socket_id malformed or missing');
  }

  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x > 7 || y < 0 || y > 7) {
    throw new Error('x or y out of bounds');
  }

  const inBounds = (checkX: number, checkY: number) => checkX >= 0 && checkX < 8 && checkY >= 0 && checkY < 8;
  const coord = (checkX: number, checkY: number) => `${checkX},${checkY}`;
  const directions = [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const;

  const transaction = db.transaction(() => {
    const game = db.prepare(
      'SELECT id, b, w, turnCount FROM games WHERE id = ?'
    ).get(cleanGameId) as GameRow | undefined;

    if (!game) {
      throw new Error('game_id not found');
    }

    const playersTurn = game.turnCount % 2 === 1 ? 'w' : 'b';
    const isBlackPlayer = cleanSocketId === game.b;
    const isWhitePlayer = cleanSocketId === game.w;
    const playerColor: 'w' | 'b' | null = isBlackPlayer ? 'b' : isWhitePlayer ? 'w' : null;

    if (!playerColor || playersTurn !== playerColor) {
      throw new Error('not players turn to move');
    }

    const playerValidMovesTable = playerColor === 'b' ? 'bValidMoves' : 'wValidMoves';
    const validMoveRow = db.prepare(
      `SELECT x, y FROM ${playerValidMovesTable} WHERE game_id = ? AND x = ? AND y = ? LIMIT 1`
    ).get(cleanGameId, x, y) as { x: number; y: number } | undefined;

    if (!validMoveRow) {
      throw new Error('illegal move');
    }

    const squareRows = db.prepare(
      'SELECT x, y, value FROM squares WHERE game_id = ? ORDER BY y ASC, x ASC'
    ).all(cleanGameId) as SquareRow[];

    if (!squareRows || squareRows.length !== 64) {
      throw new Error('invalid board state');
    }

    const board = new Map<string, 'w' | 'b' | null>();
    for (const square of squareRows) {
      board.set(coord(square.x, square.y), square.value);
    }

    if (board.get(coord(x, y)) !== null) {
      throw new Error('target square is not empty');
    }

    const enemyColor: 'w' | 'b' = playerColor === 'b' ? 'w' : 'b';
    const convertedCoordinates: { x: number; y: number }[] = [];

    for (const [dx, dy] of directions) {
      let currentX = x + dx;
      let currentY = y + dy;
      const directionCaptured: { x: number; y: number }[] = [];

      while (inBounds(currentX, currentY)) {
        const currentValue = board.get(coord(currentX, currentY));

        if (currentValue === enemyColor) {
          directionCaptured.push({ x: currentX, y: currentY });
          currentX += dx;
          currentY += dy;
          continue;
        }

        if (currentValue === playerColor && directionCaptured.length > 0) {
          convertedCoordinates.push(...directionCaptured);
        }

        break;
      }
    }

    if (convertedCoordinates.length === 0) {
      throw new Error('illegal move - no chips converted');
    }

    board.set(coord(x, y), playerColor);
    for (const move of convertedCoordinates) {
      board.set(coord(move.x, move.y), playerColor);
    }

    const changedSquares = [{ x, y }, ...convertedCoordinates];
    const updateStmt = db.prepare('UPDATE squares SET value = ? WHERE game_id = ? AND x = ? AND y = ?');
    for (const square of changedSquares) {
      updateStmt.run(playerColor, cleanGameId, square.x, square.y);
    }

    const updatedSquares = squareRows.map((square) => ({
      x: square.x,
      y: square.y,
      value: board.get(coord(square.x, square.y)) ?? null,
    }));

    let finalTurnCount = game.turnCount + 1;
    let nextPlayer: 'white' | 'black' = finalTurnCount % 2 === 1 ? 'white' : 'black';
    let nextValidMoves = getValidMoves(nextPlayer, updatedSquares);

    if (nextValidMoves.length === 0) {
      finalTurnCount += 1;
      nextPlayer = finalTurnCount % 2 === 1 ? 'white' : 'black';
      nextValidMoves = getValidMoves(nextPlayer, updatedSquares);
    }

    db.prepare('UPDATE games SET turnCount = ? WHERE id = ?').run(finalTurnCount, cleanGameId);

    db.prepare('DELETE FROM bValidMoves WHERE game_id = ?').run(cleanGameId);
    db.prepare('DELETE FROM wValidMoves WHERE game_id = ?').run(cleanGameId);

    const nextValidMovesTable = nextPlayer === 'black' ? 'bValidMoves' : 'wValidMoves';
    const insertStmt = db.prepare(`INSERT INTO ${nextValidMovesTable} (game_id, x, y) VALUES (?, ?, ?)`);
    for (const move of nextValidMoves) {
      insertStmt.run(cleanGameId, move.x, move.y);
    }
  });

  transaction();
  return true;
}






export function assignPlayer(game_id: string, socket_id: string) {
  const transaction = db.transaction(() => {
    const game = db.prepare('SELECT id, b, w FROM games WHERE id = ?').get(game_id) as any;

    if (!game) {
      throw new Error('game not found');
    }

    if (game.b === socket_id) {
      return 'b';
    }

    if (game.w === socket_id) {
      return 'w';
    }

    if (game.b === null) {
      db.prepare('UPDATE games SET b = ? WHERE id = ?').run(socket_id, game_id);
      return 'b';
    }

    if (game.w === null) {
      db.prepare('UPDATE games SET w = ? WHERE id = ?').run(socket_id, game_id);
      return 'w';
    }

    throw new Error('game already filled');
  });

  return transaction();
}

export function resignPlayer(socketId: string, gameId: string) {
  const transaction = db.transaction(() => {
    const game = db.prepare('SELECT id, b, w FROM games WHERE id = ?').get(gameId) as any;

    if (!game) {
      throw new Error('game not found')
    }

    const playerColor = game.b === socketId ? 'b' : game.w === socketId ? 'w' : null;

    if (!playerColor) {
      throw new Error('player not in game');
    }

    const updateColumn = playerColor === 'b' ? 'b' : 'w';
    db.prepare('UPDATE games SET ' + updateColumn + ' = NULL WHERE id = ?').run(gameId);
  });

  transaction();
}

export function getBoard(gameId: string, socketId: string): BoardPayload {
  const cleanGameId = String(gameId ?? "").trim();
  const cleanSocketId = String(socketId ?? "").trim();

  if (!cleanGameId || !cleanSocketId) {
    throw new DbQueryError("invalid-args", "game_id or socket_id malformed");
  }

  const transaction = db.transaction(() => {
    const game = db.prepare(
      "SELECT id, b, w, turnCount FROM games WHERE id = ?"
    ).get(cleanGameId) as GameRow | undefined;
    
    if (!game) {
      throw new DbQueryError("game-not-found", "game not found");
    }

    const squareRows = db.prepare(
      "SELECT x, y, value FROM squares WHERE game_id = ? ORDER BY y ASC, x ASC"
    ).all(cleanGameId) as SquareRow[];

    // expected board size for othello
    if (!squareRows || squareRows.length !== 64) {
      throw new DbQueryError("board-corrupt", "invalid board state");
    }

    const squares = squareRows.map((row) => ({
      x: row.x,
      y: row.y,
      value: row.value,
    }));
    const { gameOver, winner } = evaluateGameOutcome(squares);

    const isBlackPlayer = game.b === cleanSocketId;
    const isWhitePlayer = game.w === cleanSocketId;

    if (!isBlackPlayer && !isWhitePlayer) {
      return { myMove: false, validMoves: null, squares, white: game.w, black: game.b, turnCount: game.turnCount, gameOver, winner };
    }

    const playersTurn: "white" | "black" = game.turnCount % 2 === 1 ? "white" : "black";
    const socketColor: "white" | "black" = isBlackPlayer ? "black" : "white";
    const myMove = socketColor === playersTurn;

    const payload: BoardPayload = myMove
      ? { myMove: true, validMoves: getValidMoves(playersTurn, squares), squares, white: game.w, black: game.b, turnCount: game.turnCount, gameOver, winner }
      : { myMove: false, validMoves: null, squares, white: game.w, black: game.b, turnCount: game.turnCount, gameOver, winner };

    return payload;
  });

  return transaction();
}
