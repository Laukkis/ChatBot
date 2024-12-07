import { useTexture, Environment, OrbitControls } from '@react-three/drei';
import { useThree } from 'react-three-fiber';
import { Avatar } from './Avatar';

const AvatarContent = () => {
  const texture = useTexture('/background1.jpeg');
  const { viewport } = useThree();

  return (
    <>
      <mesh>
          <OrbitControls />
          <Environment preset="city" />
          <Avatar position={[0, -4, 2]} scale={3}/>
        <planeGeometry args={[viewport.width, viewport.height]} />
        <meshBasicMaterial map={texture} />
      </mesh>
    </>
  );
};

export default AvatarContent;