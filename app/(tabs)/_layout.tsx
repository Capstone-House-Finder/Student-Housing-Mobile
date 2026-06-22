import { Tabs, router } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

export default function TabsLayout() {
  const { user } = useAuth();
  const isLandlord = user?.role === 'landlord';

  return (
    <>
      <Tabs screenOptions={{ tabBarActiveTintColor: Colors.brand.magenta, headerShown: false }} initialRouteName={isLandlord ? "dashboard" : undefined}>
        <Tabs.Screen 
          name="home" 
          options={{ 
            title: 'Home',
            tabBarIcon: ({ color }) => (
              <SymbolView
                name={{ ios: 'house.fill', android: 'home' }}
                tintColor={color}
                size={24}
              />
            )
          }} 
        />
        <Tabs.Screen 
          name="search" 
          options={{ 
            title: 'Search',
            tabBarIcon: ({ color }) => (
              <SymbolView
                name={{ ios: 'magnifyingglass', android: 'search' }}
                tintColor={color}
                size={24}
              />
            )
          }} 
        />
        <Tabs.Screen 
          name="dashboard" 
          options={{ 
            title: 'Dashboard',
            tabBarIcon: ({ color }) => (
              <SymbolView
                name={{ ios: 'chart.bar.fill', android: 'bar_chart' }}
                tintColor={color}
                size={24}
              />
            )
          }} 
        />
        <Tabs.Screen 
          name="profile" 
          options={{ 
            title: 'Profile',
            tabBarIcon: ({ color }) => (
              <SymbolView
                name={{ ios: 'person.fill', android: 'person' }}
                tintColor={color}
                size={24}
              />
            )
          }} 
        />
      </Tabs>
      {isLandlord ? (
        <Pressable
          onPress={() => router.push('/landlord/create-listing')}
          style={{
            position: 'absolute',
            right: 22,
            bottom: 84,
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: Colors.brand.magenta
          }}
        >
          <Text style={{ color: '#fff', fontSize: 28, lineHeight: 30 }}>+</Text>
        </Pressable>
      ) : null}
    </>
  );
}
