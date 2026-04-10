import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../firebaseConfig';
import { signOut } from 'firebase/auth';

export default function TicketsScreen() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'tickets'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const ticketsData: any[] = [];
      for (const ticketDoc of querySnapshot.docs) {
        const ticketInfo = ticketDoc.data();
        
        // Fetch showtime info
        const showtimeRef = doc(db, 'showtimes', ticketInfo.showtimeId);
        const showtimeSnap = await getDoc(showtimeRef);
        const showtimeData = showtimeSnap.data();

        if (showtimeData) {
           // Fetch movie info
           const movieRef = doc(db, 'movies', showtimeData.movieId);
           const movieSnap = await getDoc(movieRef);
           const movieData = movieSnap.data();

           // Fetch theater info
           const theaterRef = doc(db, 'theaters', showtimeData.theaterId);
           const theaterSnap = await getDoc(theaterRef);
           const theaterData = theaterSnap.data();

           ticketsData.push({
             id: ticketDoc.id,
             ...ticketInfo,
             movieTitle: movieData?.title || 'Unknown Movie',
             theaterName: theaterData?.name || 'Unknown Theater',
             startTime: showtimeData.startTime,
           });
        }
      }
      
      // sort by bookedAt descending
      ticketsData.sort((a, b) => new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime());
      
      setTickets(ticketsData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
  };

  const renderTicket = ({ item }: { item: any }) => (
    <View style={styles.ticketCard}>
      <Text style={styles.movieTitle}>{item.movieTitle}</Text>
      <View style={styles.ticketRow}>
        <Text style={styles.label}>Rạp:</Text>
        <Text style={styles.value}>{item.theaterName}</Text>
      </View>
      <View style={styles.ticketRow}>
        <Text style={styles.label}>Giờ chiếu:</Text>
        <Text style={styles.value}>{item.startTime}</Text>
      </View>
      <View style={styles.ticketRow}>
        <Text style={styles.label}>Ghế:</Text>
        <Text style={styles.value}>{item.seatNumbers?.join(', ')}</Text>
      </View>
      <View style={styles.ticketRow}>
        <Text style={styles.label}>Mã vé:</Text>
        <Text style={styles.valueCode}>{item.id.toUpperCase()}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vé Của Tôi</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#FACC15" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id}
          renderItem={renderTicket}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Bạn chưa đặt vé nào.</Text>
          }
          onRefresh={fetchTickets}
          refreshing={loading}
        />
      )}
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
  logoutButton: {
    padding: 8,
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
    borderRadius: 8,
  },
  logoutText: {
    color: '#FACC15',
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 15,
    paddingBottom: 30,
  },
  ticketCard: {
    backgroundColor: '#1A2235',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 6,
    borderLeftColor: '#FACC15',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  movieTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  ticketRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  label: {
    color: '#9CA3AF',
    width: 90,
  },
  value: {
    color: '#fff',
    fontWeight: '600',
    flex: 1,
    fontSize: 15,
  },
  valueCode: {
    color: '#FACC15',
    fontWeight: 'bold',
    letterSpacing: 2,
    flex: 1,
    fontSize: 16,
  },
  emptyText: {
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  }
});
