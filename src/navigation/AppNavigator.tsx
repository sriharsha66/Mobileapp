import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

import { useAuth } from '../context/AuthContext';
import { useBiometric } from '../context/BiometricContext';
import { AuthStackParamList, MainStackParamList, TabParamList } from './types';
import { navigationRef, consumePendingReportNav } from './navigationRef';
import { User } from '../types';
import { hapticTab } from '../utils/haptics';
import AppLockScreen from '../screens/AppLockScreen';

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import OTPScreen from '../screens/OTPScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import SplashAnimationScreen from '../screens/SplashAnimationScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import DashboardScreen from '../screens/DashboardScreen';
import HomeScreen from '../screens/HomeScreen';
import UploadScreen from '../screens/UploadScreen';
import ReportDetailScreen from '../screens/ReportDetailScreen';
import EditReportScreen from '../screens/EditReportScreen';
import FileViewerScreen from '../screens/FileViewerScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SavedQuotesScreen from '../screens/SavedQuotesScreen';
import StarredReportsScreen from '../screens/StarredReportsScreen';
import LegalScreen from '../screens/LegalScreen';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function AddTabPlaceholder() { return null; }

function MainTabs() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56 + insets.bottom;
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: tabBarHeight,
          paddingBottom: insets.bottom + 4,
          paddingTop: 4,
          backgroundColor: theme.tabBg,
          borderTopColor: theme.tabBorder,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#1565C0',
        tabBarInactiveTintColor: theme.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={DashboardScreen}
        listeners={{ tabPress: () => hapticTab() }}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MyReportsTab"
        component={HomeScreen}
        listeners={{ tabPress: () => hapticTab() }}
        options={{
          tabBarLabel: 'My Reports',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'folder-open' : 'folder-open-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AddTab"
        component={AddTabPlaceholder}
        listeners={({ navigation: tabNav }) => ({
          tabPress: (e) => {
            e.preventDefault();
            hapticTab();
            tabNav.getParent()?.navigate('Upload', {});
          },
        })}
        options={{
          tabBarButton: (props) => (
            <TouchableOpacity
              onPress={props.onPress}
              activeOpacity={0.85}
              style={[props.style, tabStyles.addTabItem]}
            >
              <Ionicons name="add-circle-outline" size={24} color="#9E9E9E" />
              <Text style={tabStyles.addLabel}>Add</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        listeners={{ tabPress: () => hapticTab() }}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function MainNavigator() {
  return (
    <MainStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1565C0' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
      }}
      screenListeners={{ beforeRemove: () => hapticTab() }}
    >
      <MainStack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
      <MainStack.Screen name="Upload" component={UploadScreen} options={{ title: 'Add New Report', headerBackButtonMenuEnabled: false, headerBackTitle: 'Back' }} />
      <MainStack.Screen name="ReportDetail" component={ReportDetailScreen} options={{ title: 'Report Details' }} />
      <MainStack.Screen name="EditReport" component={EditReportScreen} options={{ title: 'Edit Report', headerBackButtonMenuEnabled: false, headerBackTitle: 'Back' }} />
      <MainStack.Screen
        name="FileViewer"
        component={FileViewerScreen}
        options={({ route }) => ({ title: route.params.fileName })}
      />
      <MainStack.Screen name="SavedQuotes" component={SavedQuotesScreen} options={{ title: 'Saved Quotes' }} />
      <MainStack.Screen name="StarredReports" component={StarredReportsScreen} options={{ title: 'Starred Reports' }} />
      <MainStack.Screen
        name="Legal"
        component={LegalScreen}
        options={({ route }) => ({ title: route.params.type === 'terms' ? 'Terms & Conditions' : 'Privacy Policy' })}
      />
    </MainStack.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{ headerShown: false }}
      screenListeners={{ beforeRemove: () => hapticTab() }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
      <AuthStack.Screen
        name="OTP"
        component={OTPScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: '#1565C0' },
          headerTintColor: '#fff',
          headerTitle: 'Verify Account',
          headerBackTitle: '',
        }}
      />
      <AuthStack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: '#1565C0' },
          headerTintColor: '#fff',
          headerTitle: 'Forgot Password',
          headerBackTitle: 'Back',
        }}
      />
      <AuthStack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: '#1565C0' },
          headerTintColor: '#fff',
          headerTitle: 'Reset Password',
          headerBackTitle: 'Back',
        }}
      />
    </AuthStack.Navigator>
  );
}

type AppScreen = 'auth' | 'splash' | 'welcome' | 'main';

export default function AppNavigator() {
  const { user, isLoading } = useAuth();
  const { theme, loadThemeForUser } = useTheme();
  const { isLocked } = useBiometric();
  const [screen, setScreen] = useState<AppScreen>('auth');
  const prevUserRef = useRef<User | null | undefined>(undefined);

  useEffect(() => {
    if (isLoading) {
      prevUserRef.current = undefined;
      return;
    }

    if (prevUserRef.current === undefined) {
      // Session restore — go straight to main (no splash); load theme now
      prevUserRef.current = user;
      if (user) {
        loadThemeForUser(user.id);
        setScreen('main');
      } else {
        setScreen('auth');
      }
      return;
    }

    if (prevUserRef.current === null && user !== null) {
      // Fresh login — show splash then welcome; theme loads when reaching main
      setScreen('splash');
    } else if (user === null) {
      loadThemeForUser(null);
      setScreen('auth');
    }
    prevUserRef.current = user;
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1565C0', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 32, fontWeight: '700', letterSpacing: 2 }}>MedVault</Text>
        <Text style={{ color: '#BBDEFB', marginTop: 8, fontSize: 14 }}>Your health records, always with you</Text>
      </View>
    );
  }

  const navTheme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, background: theme.bg, card: theme.tabBg, border: theme.tabBorder, text: theme.text },
  };

  if (screen === 'splash') {
    return (
      // Always go to welcome after splash (every login)
      <SplashAnimationScreen onDone={() => setScreen('welcome')} />
    );
  }

  if (screen === 'welcome') {
    return (
      <WelcomeScreen
        onDone={() => {
          if (user) loadThemeForUser(user.id);
          setScreen('main');
        }}
        isFirstLogin={!user?.avatar}
      />
    );
  }

  return (
    <>
      <NavigationContainer
        theme={navTheme}
        ref={navigationRef}
        onReady={() => {
          const reportId = consumePendingReportNav();
          if (reportId && user) {
            (navigationRef as any).navigate('ReportDetail', { reportId });
          }
        }}
      >
        {user ? <MainNavigator /> : <AuthNavigator />}
      </NavigationContainer>
      {/* AppLockScreen disabled — biometric lock feature temporarily hidden */}
    </>
  );
}

const tabStyles = StyleSheet.create({
  addTabItem: { alignItems: 'center', justifyContent: 'center' },
  addLabel: { fontSize: 10, fontWeight: '600', color: '#9E9E9E', marginTop: 2 },
});
