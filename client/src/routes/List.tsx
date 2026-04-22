import { useState, useEffect } from 'react';
import type { RoomListItem } from './api.ts';
import { getRoomList } from './api.ts';
import { buttonStyle, bsGradient } from './App.tsx';
import { useNavigate } from 'react-router-dom';


function List() {
   const [rooms, setRooms] = useState<RoomListItem[]>([]);
   const [loading, setLoading] = useState(true);

   const [codeInput, setCodeInput] = useState<string>('ABCDEF');
   const nav = useNavigate();


   function joinByCode(code :string) {

      if (code.length !==  6) return


      nav(`/${code}`)
   }



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

   return<>
      <div
         style={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: '#353025',
            gap: '48px',
         }}
      >

         <div
            style={{
               width: '100%',
               display: 'flex',
               height: '86px',
               justifyContent: "center",
               gap: '16px',
               alignItems: 'center',
               position: 'fixed',
               top: 0
            }}
         >
            <button
               style={{
                  ...buttonStyle, 
                  backgroundColor: 'green',
                  position: 'fixed',
                  zIndex: 3,
                  top: 24,
                  left: 24
               }}
            >
             go back
            </button>


            <button
               style={{
                  ...buttonStyle,
                  backgroundColor: 'ForestGreen',
                  fontSize: '20px'
               }}
               onClick={() => joinByCode(codeInput)}
            >
               JOIN
            </button>

            <input 
            style={{
               height: '40px',
               width: '256px',
               borderRadius: '4px',
               backgroundColor: '#ffffff',
               border: 'none',
               boxShadow: bsGradient,
               fontSize: '20px',
               textAlign: 'center',
            }}
            type="text"
            placeholder={codeInput}
            onChange={e => setCodeInput(e.target.value)} 
            />

         </div>

         {loading ? 
            <h1 style={{fontSize: '24px', marginTop: '94px', color: 'white'}}>Getting Games...</h1> 
            : 
            <>
               <div
                  style={{
                     flex: 1,
                     width: '100%',
                     marginTop: '96px',
                     display: 'flex',
                     flexDirection: 'column',
                     overflowY: 'scroll',
                     gap: '24px',
                     padding: '9px'
                  }}
               >

                  {rooms.map((room) => {
                     return <button 
                     style={{
                        ...buttonStyle,
                        backgroundColor: '#455055',
                        height: '48px',
                        color: 'white',
                        textAlign: 'left'
                     }}
                     key={room.code}
                     type='button'
                     onClick={() => {joinByCode(room.code)}}
                     >
                        {room.code}
                     </button>
                  })}


               </div>
            </>}

      </div>
   </>;
}

export default List;