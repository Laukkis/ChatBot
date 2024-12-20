import React, { useState, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useGraph, useFrame  } from '@react-three/fiber'
import { useGLTF, useAnimations, useFBX } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'


// Define a mapping of phonemes to visemes
const phonemeToViseme = {
  'a': 0, 'e': 1, 'i': 2, 'o': 3, 'u': 4, 'b': 5, 'c': 6, 'd': 7, 'f': 8, 'g': 9,
  'h': 10, 'j': 11, 'k': 12, 'l': 13, 'm': 14, 'n': 15, 'p': 16, 'q': 17, 'r': 18,
  's': 19, 't': 20, 'v': 21, 'w': 22, 'x': 23, 'y': 24, 'z': 25, 'ch': 26, 'sh': 27,
  'th': 28, 'ng': 29, 'zh': 30, 'aa': 31, 'ae': 32, 'ah': 33, 'ao': 34, 'aw': 35,
  'ay': 36, 'eh': 37, 'er': 38, 'ey': 39, 'ih': 40, 'iy': 41, 'ow': 42, 'oy': 43,
  'uh': 44, 'uw': 45,
};

export function Avatar(props) {
  const { scene } = useGLTF('/models/671a557545a987d3b31d8d6c.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone)
  const {animations: idleAnimation} = useFBX('/animations/Neutral Idle.fbx')
  const {animations: bowAnimation} = useFBX('/animations/Quick Informal Bow.fbx')
  const {animations: speakAnimation} = useFBX('/animations/Talking.fbx')
  const { isAISpeaking, speechContent = 'Testing' } = props

  idleAnimation[0].name = 'idle'
  bowAnimation[0].name = 'bow'
  speakAnimation[0].name = 'speak'

  const [animation, setAnimation] = useState('idle');
  const animationRef = useRef(animation);
  const cycleCountRef = useRef(0);
  const previousAnimationRef = useRef(null);
  const group = useRef();
  const {actions} = useAnimations([idleAnimation[0], bowAnimation[0],speakAnimation[0]], group)
  /* const [morphTargetInfluence, setMorphTargetInfluence] = useState(0); */

/*  useEffect(() => {
    if (actions[animation] && !actions[animation].isRunning()) {
      actions[animation].reset().fadeIn(0.8).play();
      return () => {
        actions[animation].fadeOut(0.8);
      };
    } else {
      console.warn('Animation action not found or already running:', animation);
    }
  }, [animation, actions]);  */

  useEffect(() => {
    if (actions.idle) {
        actions.idle.play();
        animationRef.current = 'idle';
    }
}, [actions]);

useEffect(() => {
  let animationInterval;
  
  if (isAISpeaking) {
      animationInterval = setInterval(() => {
          const currentAnimName = animationRef.current;
          
          if (cycleCountRef.current < 5) {
              // Play idle animation for first two cycles
              if (currentAnimName !== 'idle' && actions.idle) {
                  actions[currentAnimName]?.fadeOut(0.5);
                  actions.idle.reset().fadeIn(0.5).play();
                  animationRef.current = 'idle';
              }
              cycleCountRef.current++;
          } else {
              // On third cycle, play speak animation
              if (currentAnimName !== 'speak' && actions.speak) {
                  actions[currentAnimName]?.fadeOut(0.5);
                  actions.speak.reset().fadeIn(0.5).play();
                  animationRef.current = 'speak';
                  cycleCountRef.current = 0; // Reset counter
              }
          }
      }, 1000); // Adjust timing as needed
  } else {
      // Reset to idle when not speaking
      if (actions[animationRef.current] && actions.idle) {
          actions[animationRef.current].fadeOut(0.5);
          actions.idle.reset().fadeIn(0.5).play();
          animationRef.current = 'idle';
          cycleCountRef.current = 0;
      }
  }

  return () => {
      if (animationInterval) clearInterval(animationInterval);
  };
}, [isAISpeaking, actions]);

  useFrame(() => {
    if (!nodes.Wolf3D_Head) return;
    
    if (isAISpeaking) {
      const now = performance.now();
      const phoneme = speechContent.charAt(Math.floor(now / 100) % speechContent.length); // Slowed down update rate
      const visemeIndex = phonemeToViseme[phoneme] || 0;
      
      // Smooth transition between morphs
      nodes.Wolf3D_Head.morphTargetInfluences.forEach((_, index) => {
        const targetValue = index === visemeIndex ? 0.5 : 0; // Reduced influence strength
        nodes.Wolf3D_Head.morphTargetInfluences[index] = THREE.MathUtils.lerp(
          nodes.Wolf3D_Head.morphTargetInfluences[index],
          targetValue,
          0.1
        );
      });
    } else {
      // Reset all morphs when not speaking
      nodes.Wolf3D_Head.morphTargetInfluences.forEach((_, index) => {
        nodes.Wolf3D_Head.morphTargetInfluences[index] = 0;
      });
      setAnimation('idle');
    }
  });
  return (
    <group {...props} dispose={null} ref={group}>
      <primitive object={nodes.Hips} />
      <skinnedMesh geometry={nodes.Wolf3D_Hair.geometry} material={materials.Wolf3D_Hair} skeleton={nodes.Wolf3D_Hair.skeleton} />
      <skinnedMesh geometry={nodes.Wolf3D_Outfit_Top.geometry} material={materials.Wolf3D_Outfit_Top} skeleton={nodes.Wolf3D_Outfit_Top.skeleton} />
      <skinnedMesh geometry={nodes.Wolf3D_Outfit_Bottom.geometry} material={materials.Wolf3D_Outfit_Bottom} skeleton={nodes.Wolf3D_Outfit_Bottom.skeleton} />
      <skinnedMesh geometry={nodes.Wolf3D_Outfit_Footwear.geometry} material={materials.Wolf3D_Outfit_Footwear} skeleton={nodes.Wolf3D_Outfit_Footwear.skeleton} />
      <skinnedMesh geometry={nodes.Wolf3D_Body.geometry} material={materials.Wolf3D_Body} skeleton={nodes.Wolf3D_Body.skeleton} />
      <skinnedMesh name="EyeLeft" geometry={nodes.EyeLeft.geometry} material={materials.Wolf3D_Eye} skeleton={nodes.EyeLeft.skeleton} morphTargetDictionary={nodes.EyeLeft.morphTargetDictionary} morphTargetInfluences={nodes.EyeLeft.morphTargetInfluences} />
      <skinnedMesh name="EyeRight" geometry={nodes.EyeRight.geometry} material={materials.Wolf3D_Eye} skeleton={nodes.EyeRight.skeleton} morphTargetDictionary={nodes.EyeRight.morphTargetDictionary} morphTargetInfluences={nodes.EyeRight.morphTargetInfluences} />
      <skinnedMesh
        name="Wolf3D_Head"
        geometry={nodes.Wolf3D_Head.geometry}
        material={materials.Wolf3D_Skin}
        skeleton={nodes.Wolf3D_Head.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Head.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Head.morphTargetInfluences}
      />      <skinnedMesh name="Wolf3D_Teeth" geometry={nodes.Wolf3D_Teeth.geometry} material={materials.Wolf3D_Teeth} skeleton={nodes.Wolf3D_Teeth.skeleton} morphTargetDictionary={nodes.Wolf3D_Teeth.morphTargetDictionary} morphTargetInfluences={nodes.Wolf3D_Teeth.morphTargetInfluences} />
      <skinnedMesh name="Wolf3D_Beard" geometry={nodes.Wolf3D_Beard.geometry} material={materials.Wolf3D_Beard} skeleton={nodes.Wolf3D_Beard.skeleton} morphTargetDictionary={nodes.Wolf3D_Beard.morphTargetDictionary} morphTargetInfluences={nodes.Wolf3D_Beard.morphTargetInfluences} />
    </group>
  )
}

useGLTF.preload('/models/671a557545a987d3b31d8d6c.glb')
