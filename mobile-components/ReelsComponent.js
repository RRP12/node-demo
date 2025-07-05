import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  useWindowDimensions,
  StatusBar,
  Platform,
} from 'react-native';
import ReelItem from './ReelItem';

const ReelsComponent = ({ reelsData = [], onEndReached }) => {
  const { height } = useWindowDimensions();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const refFlatList = useRef(null);

  // Viewability configuration - 80% of item must be visible
  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 80,
    minimumViewTime: 300, // Wait 300ms before considering item viewable
  });

  // Handle viewable items change
  const onViewableItemsChanged = useCallback(({ changed, viewableItems }) => {
    if (viewableItems.length > 0) {
      const visibleItem = viewableItems[0];
      setCurrentIndex(visibleItem.index || 0);
    }
  }, []);

  // Optimized item layout for better performance
  const getItemLayout = useCallback(
    (_, index) => ({
      length: height,
      offset: height * index,
      index,
    }),
    [height],
  );

  // Key extractor for FlatList optimization
  const keyExtractor = useCallback((item) => `reel-${item._id || item.id}`, []);

  // Scroll event handler
  const onScroll = useCallback(
    Animated.event(
      [{ nativeEvent: { contentOffset: { y: scrollY } } }],
      { useNativeDriver: true }
    ),
    []
  );

  // Render individual reel item
  const renderItem = useCallback(
    ({ item, index }) => {
      const isVisible = currentIndex === index;
      const isNext = Math.abs(index - currentIndex) <= 1;

      return (
        <ReelItem
          data={item}
          index={index}
          isVisible={isVisible}
          isNext={isNext}
          height={height}
        />
      );
    },
    [currentIndex, height]
  );

  // Handle end reached for pagination
  const handleEndReached = useCallback(() => {
    if (onEndReached) {
      onEndReached();
    }
  }, [onEndReached]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" />
      <Animated.FlatList
        ref={refFlatList}
        data={reelsData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        onScroll={onScroll}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.2}
        // Performance optimizations
        pagingEnabled
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        removeClippedSubviews={Platform.OS === 'android'}
        bounces={false}
        scrollEventThrottle={16}
        // Memory optimizations
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
        updateCellsBatchingPeriod={50}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});

export default ReelsComponent;
