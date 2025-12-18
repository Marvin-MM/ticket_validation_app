import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react-native';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { LoginRequest, LoginResponse } from '@/types/api';

export default function LoginScreen() {
  const router = useRouter();
  const setManager = useAuthStore((state) => state.setManager);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      console.log('[Login] Attempting login for:', credentials.email);
      const response = await api.post<LoginResponse>('/api/v1/auth/manager/login', credentials);
      return response.data;
    },
    onSuccess: (data) => {
      console.log('[Login] Success:', data.data.manager.name);
      setManager(data.data.manager);
      router.replace('/scanner');
    },
    onError: (error: any) => {
      console.error('[Login] Error:', error.response?.data || error.message);
      Alert.alert(
        'Login Failed',
        error.response?.data?.message || 'Invalid credentials. Please try again.',
        [{ text: 'OK' }]
      );
    },
  });

  const handleLogin = () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required', 'Please enter both email and password', [{ text: 'OK' }]);
      return;
    }

    loginMutation.mutate({ email: email.trim(), password });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <ShieldCheck color="#fff" size={48} strokeWidth={2} />
          </View>
          <Text style={styles.title}>Manager Validation</Text>
          <Text style={styles.subtitle}>Secure ticket scanning for event staff</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="bouncer@venue.com"
              placeholderTextColor="#666"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              editable={!loginMutation.isPending}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor="#666"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              editable={!loginMutation.isPending}
              onSubmitEditing={handleLogin}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loginMutation.isPending && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#2a2a2a',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  } as const,
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#aaa',
  } as const,
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  } as const,
});
