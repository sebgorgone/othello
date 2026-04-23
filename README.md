#OTHELLO ONLINE

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

  - finally server changes the new squares to the correct color and declares wether the game continues or not
  - server pings client to gather a fresh board if (myturn) return {valid moves || skip turn ping} else return 'waiting'

[SQL SCHEMA]
 
  - table for games containing id, whitePLayer , blackPlayer, turnCount,
  - table for squares containing a game_id foreign key, id primary key, x INT, Y INT, value ENUM('w', 'b') NULL
  - table for wValidMoves and bValidMoves - game_id, id primary key, x INT, Y INT


[BUILD AND DEPLOYMENT]

  ##dependencies
    node 25.1.0 //*other versions may vary this is what I used*
    npm 11.6.2            //^^
    mysql-server 8.0.34   //^^
  

##running dev server

>[server]
````bash
cd path/to/othello/backend
npm i 
npm run build
node dist/index.js
````

>[client]
````bash
cd ../client
npm i
npm run dev
````

>[db]
````sql
CREATE DATABASE {OTHELLO_DB}
CREATE USER 'username'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON {OTHELLO_DB} TO 'username'@'localhost';
FLUSH PRIVILIGES;
````
[*use schema.sql to build the tables in the db (you can just copy and paste it in)*]

[ENVIRONMENT VARIABLES]
> [(othello/backend/.env)]
````bash
PORT=3000 #optional port will default to 3000 if not specified here - can be any port you want (that isnt in use)
DB_USER=username
DB_PASS=password
DB_PORT=3306 #defualt port for mysql
DB_HOST=localhost #only change if running the db on a seperate host than the server
DB_NAME=othello_db #use the name you set within mysql-server
````
> [(othello/clent/.env)]
````bash
VITE_SVR_URL=http://localhost:3000 #http address and port that the server is listening on
````


#[AI USAGE]

I used ai for a number of things in the project but the main contribution it made to the code was error handling and edge cases.
    - for example the in memory room state has to match the sql db state for the rooms, clients connected to rooms, and their respective color.
      Ai had been a huge help sanitizing inputs and making sure that errors were properly handled and understood on both sides of the stack

Ai definetly helped configure the typescript compiler for the node server as that is something I hadn't done before. I wanted to make sure that it was set up to support ESM.
Subsesquently writing typescript for node I ended up looking up alot in terms of return types and some other ts syntax I am not fully used to using.

Its last main functionality was to go over my serverside move handler algorythms- I had it try to acheive the same task that I had already implemented logic for with excessive comments to show me how it would have done it and highlight pitfalls and edgecases in my logic.
