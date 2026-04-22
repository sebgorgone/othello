import { useState, useEffect } from 'react';
import type { RoomListItem } from './api';
import { getRoomList } from './api';

function List(){
   const [roomList, setRoomList] = useState<RoomListItem[]>([]);

   useEffect( async () => {
      try {
         async () => {
            const list = await getRoomList();
            setRoomList(list);
         }
         console.log('retrieved rooms');
      } catch (err) {
         console.error("error getting list " + err);
      }

   }, [])

   return roomList.length !== 0 ? 
      <>loading...</> 
      : 
      <>loaded: {roomList}</>
}

export default List