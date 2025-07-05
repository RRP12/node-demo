import React, { memo, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Image,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Video from 'react-native-video';
import LinearGradient from 'react-native-linear-gradient';

const ReelItem = memo(({ data, index, isVisible, isNext, height }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  // Only render video component if visible or next (optimization from blog comments)
  const shouldRenderVideo = isVisible || isNext;

  // Handle video load
  const onVideoLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  // Handle video error
  const onVideoError = (error) => {
    console.log('Video error:', error);
    setHasError(true);
    setIsLoading(false);
  };

  // Handle like button press
  const handleLike = () => {
    setIsLiked(!isLiked);
    // TODO: Call API to update like status
  };

  // If not visible and not next, return placeholder to maintain layout
  if (!shouldRenderVideo) {
    return <View style={[styles.container, { height }]} />;
  }

  return (
    <View style={[styles.container, { height }]}>
      {/* Video Component */}
      {data.media?.reels?.[0]?.url && (
        <Video
          source={{ uri: data.media.reels[0].url }}
          style={styles.video}
          resizeMode="cover"
          repeat
          muted={!isVisible}
          paused={!isVisible}
          playInBackground={false}
          ignoreSilentSwitch="ignore"
          onLoad={onVideoLoad}
          onError={onVideoError}
          // Performance optimizations
          bufferConfig={{
            minBufferMs: 2000,
            maxBufferMs: 5000,
            bufferForPlaybackMs: 1000,
            bufferForPlaybackAfterRebufferMs: 1500,
          }}
        />
      )}

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}

      {/* Error state */}
      {hasError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load video</Text>
        </View>
      )}

      {/* Gradient overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.8)']}
        style={styles.gradient}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reels</Text>
      </View>

      {/* Side actions */}
      <View style={styles.sideActions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Text style={[styles.actionIcon, isLiked && styles.liked]}>♥</Text>
          <Text style={styles.actionCount}>
            {data.analytics?.likes || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionCount}>
            {data.analytics?.comments || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>📤</Text>
          <Text style={styles.actionCount}>
            {data.analytics?.shares || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>⋯</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom content */}
      <View style={styles.bottomContent}>
        <View style={styles.userInfo}>
          <Image
            source={{ 
              uri: data.store?.profileImage || 'https://via.placeholder.com/40' 
            }}
            style={styles.avatar}
          />
          <View style={styles.userDetails}>
            <Text style={styles.username}>
              {data.store?.name || 'Unknown Store'}
            </Text>
            <Text style={styles.description} numberOfLines={2}>
              {data.description || data.media?.reels?.[0]?.caption || ''}
            </Text>
          </View>
          <TouchableOpacity style={styles.followButton}>
            <Text style={styles.followText}>Follow</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title} numberOfLines={1}>
          {data.title}
        </Text>

        <View style={styles.priceContainer}>
          <Text style={styles.price}>
            ₹{data.price?.original || data.price?.discounted || 'N/A'}
          </Text>
          {data.price?.discounted && data.price?.original !== data.price?.discounted && (
            <Text style={styles.originalPrice}>
              ₹{data.price.original}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  errorText: {
    color: 'white',
    fontSize: 16,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  sideActions: {
    position: 'absolute',
    right: 15,
    bottom: 100,
    alignItems: 'center',
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 20,
  },
  actionIcon: {
    fontSize: 24,
    color: 'white',
    marginBottom: 5,
  },
  liked: {
    color: '#ff3040',
  },
  actionCount: {
    color: 'white',
    fontSize: 12,
  },
  bottomContent: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 20,
    right: 80,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  description: {
    color: 'white',
    fontSize: 14,
    opacity: 0.8,
  },
  followButton: {
    borderWidth: 1,
    borderColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 5,
  },
  followText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  originalPrice: {
    color: 'white',
    fontSize: 14,
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
});

export default ReelItem;
