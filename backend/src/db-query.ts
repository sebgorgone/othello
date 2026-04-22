import pool from './db-connect.js'

type BoardPayload = {
  myMove: boolean,
  validMoves: {x: number, y: number}[] | null,
  squares: {x: number, y: number, value: 'w' | 'b' | null}[],
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

export async function gameTruncate() {
  await pool.execute('DELETE FROM games')
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


export async function gameCreate(game_id: string) {
  const con = await pool.getConnection()
  try {
    await con.beginTransaction();
    await con.execute('INSERT INTO games (id) VALUES (?)', [game_id]);
    const squares: {x: number, y: number, value: 'w' | 'b' | null}[] = []


    for (let i = 0; i < 8; i++) {

      for (let j = 0; j < 8; j++) {

        if (i === 3 && j === 3) {
          await con.execute('INSERT INTO squares (game_id, x, y, value) VALUES (?, ?, ?, ?)', [game_id, i, j, 'w']);
          squares.push({x: i, y: j, value: 'w'});
        } else if (i === 3 && j === 4) {
          await con.execute('INSERT INTO squares (game_id, x, y, value) VALUES (?, ?, ?, ?)', [game_id, i, j, 'b']);
          squares.push({x: i, y: j, value: 'b'});
        } else if (i === 4 && j === 3) {
          await con.execute('INSERT INTO squares (game_id, x, y, value) VALUES (?, ?, ?, ?)', [game_id, i, j, 'b']);
          squares.push({x: i, y: j, value: 'b'});
        } else if (i === 4 && j === 4) {
          await con.execute('INSERT INTO squares (game_id, x, y, value) VALUES (?, ?, ?, ?)', [game_id, i, j, 'w']);
          squares.push({x: i, y: j, value: 'w'});
        } else {
          await con.execute('INSERT INTO squares (game_id, x, y) VALUES (?, ?, ?)', [game_id, i, j]);
          squares.push({x: i, y: j, value: null});
        }

      }

    }


    const validMoves = getValidMoves('black', squares);

    for (let move of validMoves) {
      await con.execute('INSERT INTO bValidMoves (game_id, x, y) VALUES (?, ?, ?)', [game_id, move.x, move.y]);
    } 

    await con.commit();
  } catch (err) {
    await con.rollback();
    throw err;
  } finally {
    con.release();
  }
}


export async function gameDelete(game_id: string) {
  await pool.execute('DELETE FROM games WHERE id = ?', [game_id])
}


export function turn() {
  const turnData = {}
  try {} catch (err) {
    console.error('error making turn')
  }
}

export async function assignPlayer(game_id: string, socket_id: string) {
  const con = await pool.getConnection();

  try {
    await con.beginTransaction();

    const [rows]: any = await con.execute('SELECT id, b, w FROM games WHERE id = ? FOR UPDATE', [game_id]);
    const game = rows?.[0];

    if (!game) {
      throw new Error('game not found');
    }

    if (game.b === socket_id) {
      await con.commit();
      return 'b';
    }

    if (game.w === socket_id) {
      await con.commit();
      return 'w';
    }

    if (game.b === null) {
      await con.execute('UPDATE games SET b = ? WHERE id = ?', [socket_id, game_id]);
      await con.commit();
      return 'b';
    }

    if (game.w === null) {
      await con.execute('UPDATE games SET w = ? WHERE id = ?', [socket_id, game_id]);
      await con.commit();
      return 'w';
    }

    throw new Error('game already filled');
  } catch (err) {
    console.error('assignPlayer error:', err);
    await con.rollback();
    throw err;
  } finally {
    con.release();
  }
}

export async function resignPlayer(socketId: string, gameId: string) {
   const con = await pool.getConnection(); 

   try {
      await con.beginTransaction();

      const [rows]: any = await con.execute('SELECT id, b, w FROM games WHERE id = ? FOR UPDATE', [gameId]);
      const game = rows?.[0];

      if (!game) {
         throw new Error('game not found')
      }

      const playerColor = game.b === socketId ? 'b' : game.w === socketId ? 'w' : null;

      if (!playerColor) {
         throw new Error('player not in game');
      }

      const updateColumn = playerColor === 'b' ? 'b' : 'w';
      await con.execute('UPDATE games SET ' + updateColumn + ' = NULL WHERE id = ?', [gameId]);
      await con.commit();
   } catch (err) {
      console.error('resignPlayer error:', err);
      await con.rollback();
      throw err;
   } finally {
      con.release()
   }
}

export async function getBoard(gameId: string, socketId: string): Promise<BoardPayload> {
  const cleanGameId = String(gameId ?? "").trim();
  const cleanSocketId = String(socketId ?? "").trim();

  if (!cleanGameId || !cleanSocketId) {
    throw new DbQueryError("invalid-args", "game_id or socket_id malformed");
  }

  const con = await pool.getConnection();

  try {
    // single snapshot read for game row + squares
    await con.beginTransaction();

    const [gameRows] = await con.execute(
      "SELECT id, b, w, turnCount FROM games WHERE id = ?",
      [cleanGameId],
    ) as unknown as [GameRow[], unknown];

    const game = gameRows?.[0];
    if (!game) {
      throw new DbQueryError("game-not-found", "game not found");
    }

    const [squareRows] = await con.execute(
      "SELECT x, y, value FROM squares WHERE game_id = ? ORDER BY y ASC, x ASC",
      [cleanGameId],
    ) as unknown as [SquareRow[], unknown];

    // expected board size for othello
    if (!squareRows || squareRows.length !== 64) {
      throw new DbQueryError("board-corrupt", "invalid board state");
    }

    const squares = squareRows.map((row) => ({
      x: row.x,
      y: row.y,
      value: row.value,
    }));

    const isBlackPlayer = game.b === cleanSocketId;
    const isWhitePlayer = game.w === cleanSocketId;

    if (!isBlackPlayer && !isWhitePlayer) {
      await con.commit();
      return { myMove: false, validMoves: null, squares };
    }

    const playersTurn: "white" | "black" = game.turnCount % 2 === 1 ? "white" : "black";
    const socketColor: "white" | "black" = isBlackPlayer ? "black" : "white";
    const myMove = socketColor === playersTurn;

    const payload: BoardPayload = myMove
      ? { myMove: true, validMoves: getValidMoves(playersTurn, squares), squares }
      : { myMove: false, validMoves: null, squares };

    await con.commit();
    return payload;
  } catch (err) {
    try {
      await con.rollback();
    } catch {
      // no-op
    }
    console.error("getBoard error:", err);
    throw err;
  } finally {
    con.release();
  }
}
