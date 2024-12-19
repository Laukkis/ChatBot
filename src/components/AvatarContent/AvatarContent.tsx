import React from 'react';
import { useTexture, Environment, OrbitControls } from '@react-three/drei';
import { useThree } from 'react-three-fiber';
import { Avatar } from './Avatar';

interface AvatarContentProps {
  isAISpeaking: boolean;
  speechContent: string
  setIsAISpeaking: (isSpeaking: boolean) => void;
}

const AvatarContent: React.FC<AvatarContentProps> = React.memo((props) => {
  const texture = useTexture('/background1.jpeg');
  const { viewport } = useThree();
  const { isAISpeaking, speechContent } = props;
  console.log('AvatarContent isAISpeaking:', isAISpeaking);


  return (
    <>
      <mesh>
          <OrbitControls />
          <Environment preset="city" />
          <Avatar isAISpeaking={isAISpeaking} setIsAISpeaking={isAISpeaking} speechContent={speechContent} position={[0, -4, 2]} scale={3}/>
        <planeGeometry args={[viewport.width, viewport.height]} />
        <meshBasicMaterial map={texture} />
      </mesh>
    </>
  );
});

export default AvatarContent;