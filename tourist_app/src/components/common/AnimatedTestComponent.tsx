import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

interface AnimatedTestComponentProps {
  style?: any;
}

const AnimatedTestComponent: React.FC<AnimatedTestComponentProps> = ({ style }) => {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { rotate: `${rotation.value}deg` },
      ],
      opacity: opacity.value,
    };
  });

  const handlePress = () => {
    // Scale animation
    scale.value = withSequence(
      withTiming(0.8, { duration: 100 }),
      withSpring(1.2, { damping: 10 }),
      withSpring(1, { damping: 10 })
    );

    // Rotation animation
    rotation.value = withTiming(rotation.value + 360, { duration: 1000 });

    // Opacity animation
    opacity.value = withSequence(
      withTiming(0.3, { duration: 200 }),
      withTiming(1, { duration: 300 })
    );
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>React Native Reanimated Test</Text>
      <Pressable onPress={handlePress}>
        <Animated.View style={[styles.box, animatedStyle]}>
          <Text style={styles.boxText}>Tap me!</Text>
        </Animated.View>
      </Pressable>
      <Text style={styles.instructions}>
        Tap the box to test Reanimated animations
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  box: {
    width: 100,
    height: 100,
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  boxText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  instructions: {
    marginTop: 20,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default AnimatedTestComponent;
