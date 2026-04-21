#OTHELLO ONLINE



*8x8 grid : x axis -> A-H, y axis -> 1-8*

[Game Start Conditions]

````
D4:white
E4:Black
D5:black
E5:white
...:empty
````

[BASIC MOVE LOGIC]

  - check the board for chips and check the surrounding board for open squares
  - make a unique list of free squares
  - for all open squares check for players colored chips -> end the loop and mark it a valid move
  - serve the valid moves 
  - when the amount of chips played reaches 28 (half the board is filled) 
    - change checking logic to check to check the empty squares for adjacent squares

  - finally server changes the new squares to the correct color and declares wether the game continues or not
  - server pings client to gather a fresh board if (myturn) return {valid moves || skip turn ping} else return 'waiting'

[SQL SCHEMA]
 
  - table for games containing id, whitePLayer , blackPlayer, turnCount,
  - table for squares containing a game_id foreign key, id primary key, x INT, Y INT, value ENUM('w', 'b') NULL
  - table for wValid moves and bValidMoves - game_id, id primary key, x INT, Y INT
