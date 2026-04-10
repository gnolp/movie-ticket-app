import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [movie, setMovie] = useState<any>(null);
  const [showtimes, setShowtimes] = useState<any[]>([]);
  const [theaters, setTheaters] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMovieData = async () => {
      setLoading(true);
      try {
        // Lấy thông tin phim
        const movieRef = doc(db, 'movies', id as string);
        const movieSnap = await getDoc(movieRef);
        if (movieSnap.exists()) {
          setMovie({ id: movieSnap.id, ...movieSnap.data() });
        }

        // Lấy các suất chiếu của phim này
        const q = query(collection(db, 'showtimes'), where('movieId', '==', id));
        const showtimesSnap = await getDocs(q);
        const showtimesList = showtimesSnap.docs.map(doc => doc.data());
        setShowtimes(showtimesList);

        // Lấy rạp cho các suất chiếu
        const theaterIds = [...new Set(showtimesList.map(st => st.theaterId))];
        const theaterData: any = {};
        for (const tId of theaterIds) {
          const tRef = doc(db, 'theaters', tId);
          const tSnap = await getDoc(tRef);
          if (tSnap.exists()) {
            theaterData[tId] = tSnap.data();
          }
        }
        setTheaters(theaterData);

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchMovieData();
    }
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FACC15" />
      </View>
    );
  }

  if (!movie) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.whiteText}>Phim không tồn tại</Text>
      </View>
    );
  }

  // Nhóm showtime theo rạp
  const showtimesByTheater: any = {};
  showtimes.forEach(st => {
    if (!showtimesByTheater[st.theaterId]) {
      showtimesByTheater[st.theaterId] = [];
    }
    showtimesByTheater[st.theaterId].push(st);
  });

  return (
    <ScrollView style={styles.container}>
      <Image source={{ uri: movie.posterUrl }} style={styles.backdrop} />
      
      <View style={styles.detailsContainer}>
        <Text style={styles.title}>{movie.title}</Text>
        <Text style={styles.metaData}>{movie.releaseDate} • {movie.duration} phút • {movie.genre}</Text>
        <Text style={styles.rating}>⭐ {movie.rating}/10</Text>
        <Text style={styles.description}>{movie.description}</Text>

        <Text style={styles.sectionTitle}>Lịch Chiếu Hôm Nay</Text>
        
        {Object.keys(showtimesByTheater).length === 0 ? (
          <Text style={styles.whiteText}>Chưa có suất chiếu.</Text>
        ) : (
          Object.keys(showtimesByTheater).map(theaterId => (
            <View key={theaterId} style={styles.theaterBlock}>
              <Text style={styles.theaterName}>{theaters[theaterId]?.name}</Text>
              <Text style={styles.theaterLocation}>{theaters[theaterId]?.location}</Text>
              
              <View style={styles.timeGrid}>
                {showtimesByTheater[theaterId]
                  .sort((a:any, b:any) => a.startTime.localeCompare(b.startTime))
                  .map((st: any) => (
                  <TouchableOpacity 
                    key={st.id} 
                    style={styles.timeButton}
                    onPress={() => router.push(`/book/${st.id}`)}
                  >
                    <Text style={styles.timeText}>{st.startTime}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  loadingContainer: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#0B0F19'
  },
  whiteText: {
    color: '#9CA3AF',
  },
  backdrop: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  detailsContainer: {
    padding: 20,
    marginTop: -20,
    backgroundColor: '#0B0F19',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  metaData: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 8,
  },
  rating: {
    color: '#FACC15',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  description: {
    color: '#D1D5DB',
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  theaterBlock: {
    marginBottom: 20,
    backgroundColor: '#1A2235',
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  theaterName: {
    color: '#FACC15',
    fontSize: 18,
    fontWeight: 'bold',
  },
  theaterLocation: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 15,
    marginTop: 4,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  timeButton: {
    backgroundColor: '#0B0F19',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#4B5563'
  },
  timeText: {
    color: '#fff',
    fontWeight: '600',
  }
});
