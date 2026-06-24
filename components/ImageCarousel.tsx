import { useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  useWindowDimensions,
  Pressable,
  Modal,
  View,
  Text,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent
} from 'react-native';
import type { Photo } from '@/lib/api-config';

export function ImageCarousel({ photos }: { photos: Photo[] }) {
  const { width } = useWindowDimensions();
  const data = photos.length ? photos : [{ url: 'https://placehold.co/900x600?text=Student+Housing' }];
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullScreenIndex, setFullScreenIndex] = useState<number | null>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  };

  const renderItem = ({ item, index }: { item: Photo; index: number }) => (
    <Pressable onPress={() => setFullScreenIndex(index)}>
      <Image source={{ uri: item.url }} style={[styles.image, { width }]} />
    </Pressable>
  );

  return (
    <>
      <View>
        <FlatList
          data={data}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => `${item.url}-${index}`}
          renderItem={renderItem}
          onScroll={onScroll}
          scrollEventThrottle={16}
        />
        <View style={styles.dots}>
          {data.map((_, idx) => (
            <View key={idx} style={[styles.dot, idx === activeIndex && styles.dotActive]} />
          ))}
        </View>
      </View>

      <Modal visible={fullScreenIndex !== null} transparent={false} animationType="fade">
        <View style={styles.modalContainer}>
          <Pressable style={styles.closeBtn} onPress={() => setFullScreenIndex(null)}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
          <FlatList
            data={data}
            horizontal
            pagingEnabled
            initialScrollIndex={fullScreenIndex ?? 0}
            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => `full-${item.url}-${index}`}
            renderItem={({ item }) => (
              <ScrollView
                maximumZoomScale={3}
                minimumZoomScale={1}
                contentContainerStyle={{ flex: 1, justifyContent: 'center' }}
                centerContent
              >
                <Image source={{ uri: item.url }} style={[styles.fullScreenImage, { width }]} resizeMode="contain" />
              </ScrollView>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  image: { height: 300 },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#fff', width: 10, height: 10, borderRadius: 5 },
  modalContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  fullScreenImage: { height: '100%' },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  closeText: { color: '#fff', fontWeight: 'bold' }
});
