import { CircularProgress } from '@mui/material';
import React, { useEffect, useState } from 'react';
import hamsterGif from '../assets/hamster-wheel.gif';

// import puckman from '../assets/puckman.gif';
// import * as puckman from '../assets/puckman.gif';

interface IloadingGifProps {
  size: string;
  color?: string;
}

const LoadingGif = (props: IloadingGifProps) => {
  const [dots, setDots] = useState(1);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setDots((dots) => {
        console.log(dots);
        const newDots = dots + 1 === 4 ? 1 : dots + 1;
        return newDots;
      });
    }, 500);

    return () => {
      console.log('clearing interval');
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div id='loader'>
      <img className='hamster' src={hamsterGif}></img>
      <div className='loading-text'>
        <span className='hidden'>{'.'.repeat(dots)}</span>
        This hamster works hard so you don't have to. New data coming right up
        <span>{'.'.repeat(dots)}</span>
      </div>
    </div>
  );
};

export default LoadingGif;
