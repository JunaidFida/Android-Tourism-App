import React from 'react';
import { View, Text, Image, StyleSheet, Pressable, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AnimatedCardProps {
  title: string;
  subtitle?: string;
  description: string;
  imageUri?: string;
  price?: number;
  rating?: number;
  onPress: () => void;
  style?: ViewStyle;
  children?: React.ReactNode;
}

const AnimatedCard: React.FC<AnimatedCardProps> = ({
  title,
  subtitle,
  description,
  imageUri,
  price,
  rating,
  onPress,
  style,
  children,
}) => {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const shadowOpacity = useSharedValue(0.1);

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
    translateY.value = withTiming(-2, { duration: 150 });
    shadowOpacity.value = withTiming(0.2, { duration: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    translateY.value = withTiming(0, { duration: 150 });
    shadowOpacity.value = withTiming(0.1, { duration: 150 });
  };

  const animatedStyle = useAnimatedStyle(() => {
    const shadowOffset = interpolate(
      translateY.value,
      [-2, 0],
      [4, 2],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { scale: scale.value },
        { translateY: translateY.value }
      ],
      shadowOpacity: shadowOpacity.value,
      shadowOffset: {
        width: 0,
        height: shadowOffset,
      },
    };
  });

  const renderRatingStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Text key={i} style={styles.starFilled}>★</Text>
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Text key={i} style={styles.starHalf}>★</Text>
        );
      } else {
        stars.push(
          <Text key={i} style={styles.starEmpty}>☆</Text>
        );
      }
    }
    return stars;
  };

  return (
    <AnimatedPressable
      style={[styles.card, animatedStyle, style]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      {imageUri && (
        <Image 
          source={{ uri: imageUri }} 
          style={styles.image}
          resizeMode="cover"
        />
      )}
      
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={2}>{title}</Text>
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
            )}
          </View>
          
          {price && (
            <View style={styles.priceContainer}>
              <Text style={styles.priceText}>Rs. {price}</Text>
            </View>
          )}
        </View>

        {rating && (
          <View style={styles.ratingContainer}>
            <View style={styles.starsContainer}>
              {renderRatingStars(rating)}
            </View>
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          </View>
        )}

        <Text style={styles.description} numberOfLines={3}>
          {description}
        </Text>

        {children}
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginVertical: 8,
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: '#F3F4F6',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  priceContainer: {
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3B82F6',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  starFilled: {
    color: '#F59E0B',
    fontSize: 16,
    marginRight: 2,
  },
  starHalf: {
    color: '#F59E0B',
    fontSize: 16,
    marginRight: 2,
    opacity: 0.5,
  },
  starEmpty: {
    color: '#D1D5DB',
    fontSize: 16,
    marginRight: 2,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});

export default AnimatedCard;
