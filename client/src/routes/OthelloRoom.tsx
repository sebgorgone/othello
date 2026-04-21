//import { useState, useEffect } from 'react';

type props = {
  code: string
}

function OthelloRoom (props: props) {
  const { code } = props;

  console.log('room code: ' + code);

  return (<>room: {code}</>)
}

export default OthelloRoom;
