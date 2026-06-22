import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { AuthStackParamList, MainStackParamList, TabParamList } from './types';

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import OTPScreen from '../screens/OTPScreen';
import DashboardScreen from '../screens/DashboardScreen';
import HomeScreen from '../screens/HomeScreen';
import UploadScreen from '../screens/UploadScreen';
import ReportDetailScreen from '../screens/ReportDetailScreen';
import EditReportScreen from '../screens/EditReportScreen';
import FileViewerScreen from '../screens/FileViewerScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SavedQuotesScreen from '../screens/SavedQuotesScreen';
import StarredReportsScreen from '../screens/StarredReportsScreen';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function AddTabPlaceholder() { return null; }

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 72,
          paddingBottom: 10,
          paddingTop: 4,
          backgroundColor: '#fff',
          borderTopColor: '#E0E0E0',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#1565C0',
        tabBarInactiveTintColor: '#9E9E9E',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={DashboardScreen}
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
              <View style={tabStyles.fabCircle}>
                <Ionicons name="add" size={26} color="#fff" />
              </View>
              <Text style={tabStyles.addLabel}>Add</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
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
      <MainStack.Screen
        name="SavedQuotes"
        component={SavedQuotesScreen}
        options={{ title: 'Saved Quotes' }}
      />
      <MainStack.Screen
        name="StarredReports"
        component={StarredReportsScreen}
        options={{ title: 'Starred Reports' }}
      />
    </MainStack.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
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
    </AuthStack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1565C0', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 32, fontWeight: '700', letterSpacing: 2 }}>MedVault</Text>
        <Text style={{ color: '#BBDEFB', marginTop: 8, fontSize: 14 }}>Your health records, always with you</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const tabStyles = StyleSheet.create({
  addTabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1565C0',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    marginBottom: 2,
  },
  addLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1565C0',
  },
});
