import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import * as Notifications from 'expo-notifications';

// Prepare Notification Handler for local demo
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F'];
const COLS = 8;
const SEAT_PRICE = 120000;

export default function BookScreen() {
  const { showtimeId } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [showtime, setShowtime] = useState<any>(null);
  const [bookedSeats, setBookedSeats] = useState<string[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    // Request notification permissions
    const requestPermissions = async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }
    };
    requestPermissions();

    const fetchBookingData = async () => {
      setLoading(true);
      try {
        const stRef = doc(db, 'showtimes', showtimeId as string);
        const stSnap = await getDoc(stRef);
        if (stSnap.exists()) {
          setShowtime({ id: stSnap.id, ...stSnap.data() });
        }

        // get booked seats
        const q = query(collection(db, 'tickets'), where('showtimeId', '==', showtimeId));
        const ticketSnaps = await getDocs(q);
        let booked: string[] = [];
        ticketSnaps.forEach(doc => {
          booked = [...booked, ...(doc.data().seatNumbers || [])];
        });
        setBookedSeats(booked);

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (showtimeId) fetchBookingData();
  }, [showtimeId]);

  const toggleSeat = (seatId: string) => {
    if (bookedSeats.includes(seatId)) return;
    
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(selectedSeats.filter(s => s !== seatId));
    } else {
      setSelectedSeats([...selectedSeats, seatId]);
    }
  };

  const handleBook = async () => {
    if (selectedSeats.length === 0) return;
    if (!user) {
      Alert.alert('Lỗi', 'Vui lòng đăng nhập để đặt vé');
      return;
    }
    
    setBooking(true);
    try {
      await addDoc(collection(db, 'tickets'), {
        userId: user.uid,
        showtimeId: showtimeId,
        seatNumbers: selectedSeats,
        bookedAt: new Date().toISOString(),
        status: 'CONFIRMED',
        totalPrice: selectedSeats.length * SEAT_PRICE
      });

      // Send local push notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🎉 Đặt vé thành công!",
          body: `Bạn đã đặt thành công ${selectedSeats.length} ghế cho suất chiếu lúc ${showtime?.startTime}.`,
        },
        trigger: null, // Send immediately
      });

      Alert.alert('Thành công', 'Đặt vé thành công!', [
        { text: 'Xem vé của tôi', onPress: () => router.replace('/(tabs)/tickets') }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FACC15" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.screenContainer}>
          <View style={styles.screen} />
          <Text style={styles.screenText}>MÀN HÌNH</Text>
        </View>

        <View style={styles.seatsContainer}>
          {ROWS.map(row => (
            <View key={row} style={styles.row}>
              <Text style={styles.rowLabel}>{row}</Text>
              {[...Array(COLS)].map((_, i) => {
                const seatId = `${row}${i + 1}`;
                const isBooked = bookedSeats.includes(seatId);
                const isSelected = selectedSeats.includes(seatId);
                
                let seatStyle: any = styles.seatAvailable;
                if (isBooked) seatStyle = styles.seatBooked;
                else if (isSelected) seatStyle = styles.seatSelected;

                return (
                  <TouchableOpacity
                    key={seatId}
                    style={[styles.seat, seatStyle]}
                    onPress={() => toggleSeat(seatId)}
                    disabled={isBooked}
                  >
                    <Text style={[styles.seatText, isSelected && { color: '#0B0F19' }]}>{i + 1}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.seatLegend, styles.seatAvailable]} />
            <Text style={styles.legendText}>Trống</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.seatLegend, styles.seatSelected]} />
            <Text style={styles.legendText}>Đang chọn</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.seatLegend, styles.seatBooked]} />
            <Text style={styles.legendText}>Đã đặt</Text>
          </View>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Tổng cộng ({selectedSeats.length} ghế):</Text>
          <Text style={styles.footerPrice}>
            {(selectedSeats.length * SEAT_PRICE).toLocaleString('vi-VN')} đ
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.bookButton, selectedSeats.length === 0 && styles.bookButtonDisabled]}
          onPress={handleBook}
          disabled={selectedSeats.length === 0 || booking}
        >
          {booking ? (
             <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.bookButtonText}>Thanh Toán</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0B0F19',
    justifyContent: 'center',
    alignItems: 'center'
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  screenContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  screen: {
    width: '80%',
    height: 10,
    backgroundColor: '#60A5FA', // Blue screen glow
    shadowColor: '#60A5FA',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  screenText: {
    color: '#9CA3AF',
    marginTop: 15,
    fontSize: 12,
    letterSpacing: 2,
  },
  seatsContainer: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  rowLabel: {
    color: '#9CA3AF',
    width: 25,
    fontSize: 16,
    fontWeight: 'bold',
  },
  seat: {
    width: 32,
    height: 32,
    marginHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  seatText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  seatAvailable: {
    backgroundColor: '#1A2235',
    borderWidth: 1,
    borderColor: '#374151',
  },
  seatSelected: {
    backgroundColor: '#FACC15',
  },
  seatBooked: {
    backgroundColor: '#000',
    opacity: 0.5,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#1A2235',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seatLegend: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  footer: {
    backgroundColor: '#1A2235',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#0B0F19',
  },
  footerLabel: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 4,
  },
  footerPrice: {
    color: '#FACC15',
    fontSize: 22,
    fontWeight: 'bold',
  },
  bookButton: {
    backgroundColor: '#FACC15',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  bookButtonDisabled: {
    backgroundColor: '#4B5563',
  },
  bookButtonText: {
    color: '#0B0F19',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
