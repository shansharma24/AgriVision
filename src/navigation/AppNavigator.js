import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { colors } from '../theme';

import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LanguageSelectionScreen from '../screens/LanguageSelectionScreen';
import LoginScreen from '../screens/LoginScreen';
import OtpScreen from '../screens/OtpScreen';
import FarmerDetailsScreen from '../screens/FarmerDetailsScreen';
import HomeLandingScreen from '../screens/HomeLandingScreen';
import DashboardScreen from '../screens/DashboardScreen';
import AddNewFarmScreen from '../screens/AddNewFarmScreen';
import EditFarmScreen from '../screens/EditFarmScreen';
import FarmNodesScreen from '../screens/FarmNodesScreen';
import FarmMapScreen from '../screens/FarmMapScreen';
import ProfileScreen from '../screens/ProfileScreen';
import KrishiMitriChatScreen from '../screens/KrishiMitriChatScreen';
import CropRecommendationScreen from '../screens/CropRecommendationScreen';
import FertilizerRecommendationScreen from '../screens/FertilizerRecommendationScreen';
import DiseaseDetectionScreen from '../screens/DiseaseDetectionScreen';
import DiseaseProcessingScreen from '../screens/DiseaseProcessingScreen';
import DiseaseResultScreen from '../screens/DiseaseResultScreen';
import MarketPriceScreen from '../screens/MarketPriceScreen';
import RoverScreen from '../screens/RoverScreen';
import LogsScreen from '../screens/LogsScreen';
import AssistantScreen from '../screens/AssistantScreen';
import GovtSchemesScreen from '../screens/GovtSchemesScreen';
import CropsScreen from '../screens/CropsScreen';
import EquipmentScreen from '../screens/EquipmentScreen';
import FAQScreen from '../screens/FAQScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { isDark } = useApp();

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      primary: colors.primary,
      background: isDark ? colors.backgroundDark : colors.backgroundLight,
      card: isDark ? colors.surfaceDark : colors.primary,
      text: isDark ? '#E8F5E9' : colors.textPrimary,
      border: isDark ? '#153525' : colors.border,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
      >
        {/* Entry / onboarding */}
        <Stack.Screen name="Splash" component={SplashScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Language" component={LanguageSelectionScreen} />

        {/* Auth */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Otp" component={OtpScreen} />
        <Stack.Screen name="FarmerDetails" component={FarmerDetailsScreen} />

        {/* Farm */}
        <Stack.Screen name="HomeLanding" component={HomeLandingScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="AddFarm" component={AddNewFarmScreen} />
        <Stack.Screen name="EditFarm" component={EditFarmScreen} />
        <Stack.Screen name="FarmNodes" component={FarmNodesScreen} />
        <Stack.Screen name="FarmMap" component={FarmMapScreen} />

        {/* Main modules */}
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="KrishiMitri" component={KrishiMitriChatScreen} />
        <Stack.Screen name="CropRecommendation" component={CropRecommendationScreen} />
        <Stack.Screen name="FertilizerRecommendation" component={FertilizerRecommendationScreen} />
        <Stack.Screen name="DiseaseDetection" component={DiseaseDetectionScreen} />
        <Stack.Screen name="DiseaseProcessing" component={DiseaseProcessingScreen} />
        <Stack.Screen name="DiseaseResult" component={DiseaseResultScreen} />
        <Stack.Screen name="MarketPrice" component={MarketPriceScreen} />
        <Stack.Screen name="Rover" component={RoverScreen} />
        <Stack.Screen name="Logs" component={LogsScreen} />
        <Stack.Screen name="Assistant" component={AssistantScreen} />
        <Stack.Screen name="GovtSchemes" component={GovtSchemesScreen} />
        <Stack.Screen name="Crops" component={CropsScreen} />
        <Stack.Screen name="Equipment" component={EquipmentScreen} />
        <Stack.Screen name="FAQ" component={FAQScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
