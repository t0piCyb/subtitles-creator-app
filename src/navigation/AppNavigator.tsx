import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../constants/theme';
import { HomeScreen } from '../screens/HomeScreen';
import { TranscribingScreen } from '../screens/TranscribingScreen';
import { EditorScreen } from '../screens/EditorScreen';
import { ExportScreen } from '../screens/ExportScreen';

const Stack = createNativeStackNavigator();

export function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="Transcribing"
        component={TranscribingScreen}
        options={{ title: 'Transcription', headerBackVisible: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="Editor"
        component={EditorScreen}
        options={{ title: 'Éditeur', headerBackTitle: 'Accueil' }}
      />
      <Stack.Screen
        name="Export"
        component={ExportScreen}
        options={{ title: 'Export', headerBackTitle: 'Éditeur' }}
      />
    </Stack.Navigator>
  );
}
