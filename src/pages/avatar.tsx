import React from 'react';
import { Canvas } from 'react-three-fiber';
import AvatarContent from '@/components/AvatarContent/AvatarContent';
import styles from './Avatar.module.scss';

const Avatar = () => {
  return (
    <>
    <div className={styles.container}>
      <Canvas shadows camera={{position: [0,0,8], fov:42 }}>
        <AvatarContent />
      </Canvas>
    </div>
    <h2>Test</h2>
    </>
  );
};

export default Avatar;