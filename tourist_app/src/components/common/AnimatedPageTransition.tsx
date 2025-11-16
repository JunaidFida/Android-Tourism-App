import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Easing,
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface AnimatedPageTransitionProps {
  children: React.ReactNode;
  isVisible: boolean;
  transitionType?: 'slide' | 'fade' | 'scale' | 'slideUp';
  duration?: number;
  delay?: number;
}

const AnimatedPageTransition: React.FC<AnimatedPageTransitionProps> = ({
  children,
  isVisible,
  transitionType = 'fade',
  duration = 300,
  delay = 0,
}) => {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(screenWidth);
  const translateY = useSharedValue(screenHeight);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    if (isVisible) {
      // Entry animations
      setTimeout(() => {
        switch (transitionType) {
          case 'slide':
            opacity.value = withTiming(1, { duration, easing: Easing.out(Easing.quad) });
            translateX.value = withSpring(0, { damping: 20, stiffness: 90 });
            break;
          
          case 'slideUp':
            opacity.value = withTiming(1, { duration, easing: Easing.out(Easing.quad) });
            translateY.value = withSpring(0, { damping: 20, stiffness: 90 });
            break;
          
          case 'scale':
            opacity.value = withTiming(1, { duration, easing: Easing.out(Easing.quad) });
            scale.value = withSpring(1, { damping: 15, stiffness: 100 });
            break;
          
          case 'fade':
          default:
            opacity.value = withTiming(1, { duration, easing: Easing.out(Easing.quad) });
            break;
        }
      }, delay);
    } else {
      // Exit animations
      switch (transitionType) {
        case 'slide':
          opacity.value = withTiming(0, { duration: duration * 0.7, easing: Easing.in(Easing.quad) });
          translateX.value = withTiming(-screenWidth * 0.3, { 
            duration: duration * 0.7, 
            easing: Easing.in(Easing.quad) 
          });
          break;
        
        case 'slideUp':
          opacity.value = withTiming(0, { duration: duration * 0.7, easing: Easing.in(Easing.quad) });
          translateY.value = withTiming(-screenHeight * 0.1, { 
            duration: duration * 0.7, 
            easing: Easing.in(Easing.quad) 
          });
          break;
        
        case 'scale':
          opacity.value = withTiming(0, { duration: duration * 0.7, easing: Easing.in(Easing.quad) });
          scale.value = withTiming(0.9, { duration: duration * 0.7, easing: Easing.in(Easing.quad) });
          break;
        
        case 'fade':
        default:
          opacity.value = withTiming(0, { duration: duration * 0.7, easing: Easing.in(Easing.quad) });
          break;
      }
    }
  }, [isVisible, transitionType, duration, delay, opacity, translateX, translateY, scale]);

  const animatedStyle = useAnimatedStyle(() => {
    const baseStyle = {
      opacity: opacity.value,
    };

    switch (transitionType) {
      case 'slide':
        return {
          ...baseStyle,
          transform: [{ translateX: translateX.value }],
        };
      
      case 'slideUp':
        return {
          ...baseStyle,
          transform: [{ translateY: translateY.value }],
        };
      
      case 'scale':
        return {
          ...baseStyle,
          transform: [{ scale: scale.value }],
        };
      
      case 'fade':
      default:
        return baseStyle;
    }
  });

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {children}
    </Animated.View>
  );
};

// Hook for staggered animations
export const useStaggeredAnimation = (items: any[], isVisible: boolean, staggerDelay = 100) => {
  const animations = items.map(() => ({
    opacity: useSharedValue(0),
    translateY: useSharedValue(30),
  }));

  useEffect(() => {
    if (isVisible) {
      animations.forEach((anim, index) => {
        setTimeout(() => {
          anim.opacity.value = withTiming(1, { 
            duration: 400, 
            easing: Easing.out(Easing.back(1.2)) 
          });
          anim.translateY.value = withSpring(0, { 
            damping: 15, 
            stiffness: 100 
          });
        }, index * staggerDelay);
      });
    } else {
      animations.forEach((anim) => {
        anim.opacity.value = withTiming(0, { duration: 200 });
        anim.translateY.value = withTiming(30, { duration: 200 });
      });
    }
  }, [isVisible, animations, staggerDelay]);

  return animations.map(anim => 
    useAnimatedStyle(() => ({
      opacity: anim.opacity.value,
      transform: [{ translateY: anim.translateY.value }],
    }))
  );
};

// Component for individual staggered items
interface StaggeredItemProps {
  children: React.ReactNode;
  animatedStyle: any;
  delay?: number;
}

export const StaggeredItem: React.FC<StaggeredItemProps> = ({ 
  children, 
  animatedStyle 
}) => {
  return (
    <Animated.View style={animatedStyle}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AnimatedPageTransition;
