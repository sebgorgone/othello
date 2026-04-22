import { useState, useEffect } from 'react';
import type { RoomListItem } from './api';
import { roomList as getRoomList } from './api';

function List() {
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRooms() {
      try {
        const list = await getRoomList();
        setRooms(list);
        console.log('retrieved rooms');
      } catch (err) {
        console.error('error getting list', err);
      } finally {
        setLoading(false);
      }
    }

    fetchRooms();
  }, []);

  return loading ? <div>loading...</div> : <div>loaded: {rooms.length} rooms</div>;
}

export default List;