import React, { useEffect } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  Easing,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface AnimatedLoadingScreenProps {
  isVisible: boolean;
  message?: string;
}

const AnimatedLoadingScreen: React.FC<AnimatedLoadingScreenProps> = ({ 
  isVisible, 
  message = 'Loading...' 
}) => {
  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0);
  const rotateAnim = useSharedValue(0);
  const pulseAnim = useSharedValue(1);

  useEffect(() => {
    if (isVisible) {
      // Fade in animation
      fadeAnim.value = withTiming(1, { duration: 300 });
      
      // Scale in animation
      scaleAnim.value = withTiming(1, { 
        duration: 400,
        easing: Easing.out(Easing.back(1.5))
      });
      
      // Continuous rotation
      rotateAnim.value = withRepeat(
        withTiming(360, { 
          duration: 2000, 
          easing: Easing.linear 
        }), 
        -1, 
        false
      );
      
      // Pulse animation
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        true
      );
    } else {
      // Fade out animation
      fadeAnim.value = withTiming(0, { duration: 200 });
      scaleAnim.value = withTiming(0, { duration: 200 });
      rotateAnim.value = 0;
      pulseAnim.value = 1;
    }
  }, [isVisible, fadeAnim, scaleAnim, rotateAnim, pulseAnim]);

  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeAnim.value,
      transform: [{ scale: scaleAnim.value }],
    };
  });

  const spinnerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotateAnim.value}deg` }],
    };
  });

  const pulseAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseAnim.value }],
      opacity: interpolate(pulseAnim.value, [0.8, 1], [0.6, 1]),
    };
  });

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      <View style={styles.content}>
        {/* Outer pulse circle */}
        <Animated.View style={[styles.pulseCircle, pulseAnimatedStyle]} />
        
        {/* Spinning loader */}
        <Animated.View style={[styles.spinner, spinnerAnimatedStyle]}>
          <View style={styles.spinnerInner}>
            <View style={styles.spinnerSegment1} />
            <View style={styles.spinnerSegment2} />
            <View style={styles.spinnerSegment3} />
          </View>
        </Animated.View>
        
        {/* Loading text */}
        <Animated.Text style={[styles.loadingText, pulseAnimatedStyle]}>
          {message}
        </Animated.Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: width,
    height: height,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCircle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  spinner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerInner: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  spinnerSegment1: {
    position: 'absolute',
    top: 5,
    left: '50%',
    width: 4,
    height: 20,
    backgroundColor: '#3B82F6',
    borderRadius: 2,
    marginLeft: -2,
  },
  spinnerSegment2: {
    position: 'absolute',
    top: 12,
    right: 5,
    width: 4,
    height: 15,
    backgroundColor: '#60A5FA',
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
  spinnerSegment3: {
    position: 'absolute',
    top: 20,
    right: 12,
    width: 4,
    height: 10,
    backgroundColor: '#93C5FD',
    borderRadius: 2,
    transform: [{ rotate: '90deg' }],
  },
  loadingText: {
    marginTop: 30,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
});

export default AnimatedLoadingScreen;
