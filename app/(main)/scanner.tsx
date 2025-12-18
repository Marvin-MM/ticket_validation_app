import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { Wifi, WifiOff, Camera, X, CameraOff } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { useAppStore } from '@/store/app';
import { findTicketByQR, updateTicketScanCount, addValidationLog } from '@/lib/database';
import type { ScanResponse } from '@/types/api';

type ValidationResult = {
  type: 'success' | 'warning' | 'error';
  message: string;
  ticket?: ScanResponse['ticket'];
  customer?: ScanResponse['customer'];
};

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const fadeAnim = useState(() => new Animated.Value(0))[0];
  
  const { isOfflineMode, isOnline } = useAppStore();

  // Auto-close camera after showing results
  useEffect(() => {
    if (validationResult && isCameraActive) {
      // Camera will close after result animation completes
      const timer = setTimeout(() => {
        setIsCameraActive(false);
      }, 2100); // Matches the animation duration (300 + 1400 + 300 + 100)
      
      return () => clearTimeout(timer);
    }
  }, [validationResult, isCameraActive]);

  const onlineScanMutation = useMutation({
    mutationFn: async (qrData: string) => {
      console.log('[Scanner] Sending validation request');
      console.log('[Scanner] QR Data (first 50 chars):', qrData.substring(0, 50));
      
      const payload = {
        qr_data: qrData,
      };
      
      console.log('[Scanner] Sending payload to:', '/api/v1/validation/scan');
      
      const response = await api.post<ScanResponse>('/api/v1/validation/scan', payload);
      return response.data;
    },
    onSuccess: async (data) => {
      console.log('[Scanner] Online validation success:', data.message);
      
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      playSuccessSound();
      
      const type = data.ticket.remainingScans === 0 ? 'warning' : 'success';
      showResult({
        type,
        message: data.message,
        ticket: data.ticket,
        customer: data.customer,
      });
    },
    onError: (error: any) => {
      console.error('[Scanner] Online validation error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      
      playErrorSound();
      
      showResult({
        type: 'error',
        message: error.response?.data?.message || 'Validation failed',
      });
    },
  });

  const handleBarCodeScanned = ({ data }: BarcodeScanningResult) => {
    if (isPaused || scannedData === data) return;
    
    console.log('[Scanner] QR Code scanned');
    setScannedData(data);
    setIsPaused(true);

    if (isOfflineMode || !isOnline) {
      handleOfflineValidation(data);
    } else {
      onlineScanMutation.mutate(data);
    }
  };

  const handleOfflineValidation = async (qrData: string) => {
    try {
      const ticket = await findTicketByQR(qrData);
      
      if (!ticket) {
        if (Platform.OS !== 'web') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        playErrorSound();
        showResult({
          type: 'error',
          message: 'Ticket not found in offline database',
        });
        return;
      }

      if (ticket.scanCount >= ticket.maxScans) {
        if (Platform.OS !== 'web') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        playErrorSound();
        showResult({
          type: 'error',
          message: `Already used (${ticket.scanCount}/${ticket.maxScans})`,
        });
        return;
      }

      const newCount = ticket.scanCount + 1;
      await updateTicketScanCount(ticket.ticketId, newCount);
      await addValidationLog({
        ticketId: ticket.ticketId,
        campaignId: 'offline',
        timestamp: new Date().toISOString(),
      });

      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      playSuccessSound();

      showResult({
        type: newCount === ticket.maxScans ? 'warning' : 'success',
        message: `Validated (Scan ${newCount}/${ticket.maxScans})`,
        ticket: {
          ticketNumber: ticket.ticketId,
          scanCount: newCount,
          maxScans: ticket.maxScans,
          remainingScans: ticket.maxScans - newCount,
        },
      });
    } catch (error) {
      console.error('[Scanner] Offline validation error:', error);
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      playErrorSound();
      showResult({
        type: 'error',
        message: 'Offline validation failed',
      });
    }
  };

  const showResult = (result: ValidationResult) => {
    setValidationResult(result);
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        setValidationResult(null);
        setScannedData(null);
        setIsPaused(false);
      }, 100);
    });
  };

  const playSuccessSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
        { shouldPlay: true, volume: 0.5 }
      );
      setTimeout(() => sound.unloadAsync(), 1000);
    } catch (error) {
      console.log('[Sound] Success sound error:', error);
    }
  };

  const playErrorSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3' },
        { shouldPlay: true, volume: 0.5 }
      );
      setTimeout(() => sound.unloadAsync(), 1000);
    } catch (error) {
      console.log('[Sound] Error sound error:', error);
    }
  };

  const handleStartScanning = () => {
    setIsCameraActive(true);
    setValidationResult(null);
    setScannedData(null);
    setIsPaused(false);
  };

  const handleCloseCamera = () => {
    setIsCameraActive(false);
    setValidationResult(null);
    setScannedData(null);
    setIsPaused(false);
  };

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });
  }, []);

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Camera color="#666" size={64} />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            This app needs camera access to scan QR codes on tickets.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {isCameraActive ? (
        <>
          <CameraView
            style={styles.camera}
            onBarcodeScanned={isPaused ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          />

          <SafeAreaView style={styles.overlay} edges={['top']}>
            <View style={styles.header}>
              <View style={[styles.badge, !isOnline && styles.badgeOffline]}>
                {isOnline ? <Wifi size={16} color="#10b981" /> : <WifiOff size={16} color="#ef4444" />}
                <Text style={styles.badgeText}>
                  {isOfflineMode ? 'Offline Mode' : isOnline ? 'Online' : 'No Connection'}
                </Text>
              </View>
              
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={handleCloseCamera}
                activeOpacity={0.7}
              >
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.scanArea}>
              <View style={styles.scanFrame} />
              <Text style={styles.scanText}>Align QR code within frame</Text>
            </View>
          </SafeAreaView>

          {validationResult && (
            <Animated.View
              style={[
                styles.resultOverlay,
                {
                  backgroundColor:
                    validationResult.type === 'success'
                      ? '#10b981'
                      : validationResult.type === 'warning'
                      ? '#f59e0b'
                      : '#ef4444',
                  opacity: fadeAnim,
                },
              ]}
            >
              <Text style={styles.resultMessage}>{validationResult.message}</Text>
              {validationResult.ticket && (
                <>
                  <Text style={styles.resultDetail}>
                    Ticket: {validationResult.ticket.ticketNumber}
                  </Text>
                  {validationResult.customer && (
                    <Text style={styles.resultDetail}>
                      {validationResult.customer.firstName} {validationResult.customer.lastName}
                    </Text>
                  )}
                  <Text style={styles.resultDetail}>
                    Scans: {validationResult.ticket.scanCount}/{validationResult.ticket.maxScans}
                  </Text>
                </>
              )}
            </Animated.View>
          )}
        </>
      ) : (
        <SafeAreaView style={styles.idleContainer}>
          <View style={styles.idleContent}>
            <CameraOff color="#2563eb" size={70} />
            <Text style={styles.idleTitle}>Ready to Scan</Text>
            <Text style={styles.idleDescription}>
              Tap the button below to open the camera and start scanning tickets
            </Text>
            
            <View style={[styles.badge, styles.statusBadge, !isOnline && styles.badgeOffline]}>
              {isOnline ? <Wifi size={16} color="#10b981" /> : <WifiOff size={16} color="#ef4444" />}
              <Text style={styles.badgeText}>
                {isOfflineMode ? 'Offline Mode' : isOnline ? 'Online' : 'No Connection'}
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.scanButton} 
              onPress={handleStartScanning}
              activeOpacity={0.8}
            >
              <Camera size={24} color="#fff" />
              <Text style={styles.scanButtonText}>Start Scanning</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  camera: {
    flex: 1,
  },
  message: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 100,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 24,
    marginBottom: 12,
  } as const,
  permissionText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  } as const,
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badgeOffline: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  } as const,
  closeButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
    borderRadius: 20,
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#fff',
    borderRadius: 24,
    backgroundColor: 'transparent',
  },
  scanText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 24,
    textAlign: 'center',
    fontWeight: '600',
  } as const,
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  resultMessage: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  } as const,
  resultDetail: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  } as const,
  idleContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  idleContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  idleTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginTop: 24,
    marginBottom: 12,
  } as const,
  idleDescription: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  statusBadge: {
    marginBottom: 48,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#2563eb',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  } as const,
});