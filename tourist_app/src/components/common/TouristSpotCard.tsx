import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { TouristSpot } from '@/types';
import { Colors, Typography, Spacing } from '@/theme';

interface TouristSpotCardProps {
  spot: TouristSpot;
  onPress: () => void;
  onFavoritePress?: () => void;
  isFavorite?: boolean;
}

const { width } = Dimensions.get('window');

const TouristSpotCard: React.FC<TouristSpotCardProps> = ({
  spot,
  onPress,
  onFavoritePress,
  isFavorite = false,
}) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: spot.image_urls?.[0] || 'https://via.placeholder.com/300x200' }} 
          style={styles.image}
          resizeMode="cover"
        />
        {onFavoritePress && (
          <TouchableOpacity 
            style={styles.favoriteButton}
            onPress={onFavoritePress}
            activeOpacity={0.8}
          >
            <AntDesign 
              name={isFavorite ? "heart" : "hearto"} 
              size={20} 
              color={isFavorite ? Colors.error[500] : Colors.neutral[0]} 
            />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>{spot.name}</Text>
        <Text style={styles.location} numberOfLines={1}>
          <AntDesign name="enviromento" size={12} color={Colors.neutral[500]} />
          {' '}{typeof spot.location === 'string' ? spot.location : spot.location.address}
        </Text>
        
        <View style={styles.detailsRow}>
          <View style={styles.ratingContainer}>
            <AntDesign name="star" size={14} color={Colors.warning[500]} />
            <Text style={styles.rating}>{spot.rating?.toFixed(1) || '0.0'}</Text>
          </View>
          
          <Text style={styles.category}>{spot.categories?.[0] || 'General'}</Text>
        </View>
        
        {spot.description && (
          <Text style={styles.description} numberOfLines={2}>
            {spot.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    marginBottom: Spacing.md,
    shadowColor: Colors.neutral[900],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    height: 200,
    width: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  favoriteButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    padding: 8,
  },
  content: {
    padding: Spacing.md,
  },
  name: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  location: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.text.primary,
    marginLeft: 4,
  },
  category: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.primary[500],
    backgroundColor: Colors.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  description: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.text.tertiary,
    lineHeight: Typography.lineHeights.sm,
  },
});

export default TouristSpotCard;
