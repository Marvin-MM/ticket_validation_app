import { Tabs } from "expo-router";
import React from "react";
import { ScanLine, BarChart3, Settings } from "lucide-react-native";

export default function MainLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0a0a0a',
          borderTopColor: '#2a2a2a',
          borderTopWidth: 0,
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#666',
      }}
    >
      <Tabs.Screen
        name="scanner"
        options={{
          title: "Scan",
          tabBarIcon: ({ color, size }) => <ScanLine color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Stats",
          tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
