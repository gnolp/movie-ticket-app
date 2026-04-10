import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, RefreshControl } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useRouter } from 'expo-router';
import { seedData } from '../../utils/seed';

export default function HomeScreen() {
  const [movies, setMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchMovies = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'movies'));
      const moviesList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMovies(moviesList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  const handleSeed = async () => {
    alert('Đang seed dữ liệu, vui lòng đợi...');
    const success = await seedData();
    if(success) {
      alert('Seed thành công!');
      fetchMovies();
    }
  };

  const renderMovie = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.movieCard}
      onPress={() => router.push(`/movie/${item.id}`)}
    >
      <View>
        <Image source={{ uri: item.posterUrl }} style={styles.poster} />
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingBadgeText}>⭐ {item.rating}</Text>
        </View>
      </View>
      <View style={styles.movieInfo}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.genre} numberOfLines={1}>{item.genre}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Now Playing</Text>
        {movies.length === 0 && !loading && (
          <TouchableOpacity style={styles.seedButton} onPress={handleSeed}>
            <Text style={styles.seedButtonText}>Tạo Dữ liệu Mẫu</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <FlatList
        data={movies}
        keyExtractor={(item) => item.id}
        renderItem={renderMovie}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchMovies}
            tintColor="#FACC15"
          />
        }
        ListEmptyComponent={
          !loading ? <Text style={styles.emptyText}>Chưa có phim nào. Bấm nút Tạo Dữ liểu Mẫu.</Text> : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
    backgroundColor: '#1A2235',
    borderBottomWidth: 1,
    borderBottomColor: '#0B0F19',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FACC15',
  },
  seedButton: {
    backgroundColor: '#FACC15',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  seedButtonText: {
    color: '#0B0F19',
    fontSize: 12,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 10,
    paddingBottom: 30,
  },
  movieCard: {
    flex: 1,
    margin: 8,
    backgroundColor: '#1A2235',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  poster: {
    width: '100%',
    aspectRatio: 2/3,
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(26, 34, 53, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingBadgeText: {
    color: '#FACC15',
    fontSize: 12,
    fontWeight: 'bold',
  },
  movieInfo: {
    padding: 12,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  genre: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  emptyText: {
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 50,
  }
});
