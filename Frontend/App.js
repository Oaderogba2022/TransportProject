import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button, Text, View, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    Notifications.getPermissionsAsync()
      .then(({ status }) => {
        let finalStatus = status;
        if (finalStatus !== 'granted') {
          return Notifications.requestPermissionsAsync();
        }
        return finalStatus;
      })
      .then(finalStatus => {
        if (finalStatus !== 'granted') {
          Alert.alert('Permission Required', 'Push notifications need permissions.');
        }
      })
      .catch(err => {
        console.log('Notification permission error:', err);
      });
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="SignIn">
        <Stack.Screen name="SignIn" component={SignInScreen} options={{ title: 'Sign In' }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Transit Companion' }} />
        <Stack.Screen name="RouteDetails" component={RouteDetailsScreen} options={{ title: 'Route Details' }} />
        <Stack.Screen name="AddRoute" component={AddRouteScreen} options={{ title: 'Add New Route' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const SignInScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const signIn = () => {
    fetch('http://your-ec2-public-ip:3010/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          Alert.alert('Success', 'Signed in successfully');
          navigation.navigate('Home');
        } else {
          Alert.alert('Error', data.theError?.message || 'Sign-in failed');
        }
      })
      .catch(err => {
        Alert.alert('Error', 'Sign-in error: ' + err.message);
      });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Sign In</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
      />
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
      />
      <Button title="Sign In" onPress={signIn} />
    </View>
  );
};

const HomeScreen = ({ navigation }) => {
  const [routes, setRoutes] = useState([]);

  const fetchRoutes = () => {
    fetch('http://your-ec2-public-ip:3010/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRoutes(data.Routes);
        } else {
          Alert.alert('Error', data.theError?.message || 'Failed to fetch routes');
        }
      })
      .catch(err => {
        Alert.alert('Error', 'Error fetching routes: ' + err.message);
      });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Your Saved Routes</Text>
      <Button title="Refresh Routes" onPress={fetchRoutes} />
      <FlatList
        data={routes}
        keyExtractor={(item) => item.routeId || item._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.routeItem}
            onPress={() => {
              if (!item.routeId) {
                Alert.alert('Error', 'Route ID is missing');
                return;
              }
              navigation.navigate('RouteDetails', { route: item });
            }}
          >
            <Text style={styles.routeText}>{item.name || 'Unnamed Route'}</Text>
          </TouchableOpacity>
        )}
      />
      <Button title="Add New Route" onPress={() => navigation.navigate('AddRoute')} />
    </View>
  );
};

const RouteDetailsScreen = ({ route, navigation }) => {
  const { route: routeData } = route.params;
  const [routeDetails, setRouteDetails] = useState(routeData);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(routeData.name || '');
  const [editedStop, setEditedStop] = useState(routeData.stop || '');

  const fetchRouteDetails = () => {
    if (!routeData.routeId) {
      Alert.alert('Error', 'Cannot fetch route: Route ID is missing');
      return;
    }
    fetch('http://your-ec2-public-ip:3010/getSpecificRoute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routeId: routeData.routeId }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRouteDetails(data.theRoute);
          setEditedName(data.theRoute.name || '');
          setEditedStop(data.theRoute.stop || '');
        } else {
          Alert.alert('Error', data.theError?.message || 'Failed to fetch route');
        }
      })
      .catch(err => {
        Alert.alert('Error', 'Error fetching route: ' + err.message);
      });
  };

  const updateRoute = () => {
    if (!routeData.routeId) {
      Alert.alert('Error', 'Cannot update: Route ID is missing');
      return;
    }
    fetch('http://your-ec2-public-ip:3010/updateSpecificRoute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routeId: routeData.routeId,
        name: editedName,
        stop: editedStop,
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRouteDetails(data.theRoute);
          setIsEditing(false);
          Alert.alert('Success', 'Route updated successfully');
        } else {
          Alert.alert('Error', data.theError?.message || 'Failed to update route');
        }
      })
      .catch(err => {
        Alert.alert('Error', 'Error updating route: ' + err.message);
      });
  };

  const deleteRoute = () => {
    if (!routeData.routeId) {
      Alert.alert('Error', 'Cannot delete: Route ID is missing');
      return;
    }
    fetch('http://your-ec2-public-ip:3010/deleteSpecificRoute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routeId: routeData.routeId }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          Alert.alert('Success', 'Route deleted successfully');
          navigation.navigate('Home');
        } else {
          Alert.alert('Error', data.theError?.message || 'Failed to delete route');
        }
      })
      .catch(err => {
        Alert.alert('Error', 'Error deleting route: ' + err.message);
      });
  };

  return (
    <View style={styles.container}>
      {isEditing ? (
        <>
          <TextInput
            style={styles.input}
            value={editedName}
            onChangeText={setEditedName}
            placeholder="Route Name"
          />
          <TextInput
            style={styles.input}
            value={editedStop}
            onChangeText={setEditedStop}
            placeholder="Stop Name"
          />
          <Button title="Save" onPress={updateRoute} />
          <Button title="Cancel" onPress={() => setIsEditing(false)} />
        </>
      ) : (
        <>
          <Text style={styles.detailText}>Route Name: {routeDetails.name || 'N/A'}</Text>
          <Text style={styles.detailText}>Route ID: {routeDetails.routeId || 'N/A'}</Text>
          <Text style={styles.detailText}>Stop: {routeDetails.stop || 'N/A'}</Text>
          <Button title="Refresh Details" onPress={fetchRouteDetails} />
          <Button title="Edit" onPress={() => setIsEditing(true)} />
          <Button title="Delete" onPress={deleteRoute} />
        </>
      )}
    </View>
  );
};

const AddRouteScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [stop, setStop] = useState('');

  const scheduleNotification = (routeName) => {
    Notifications.scheduleNotificationAsync({
      content: {
        title: 'Route Added',
        body: `Your route "${routeName}" has been added! Check its schedule soon.`,
        data: { routeName },
      },
      trigger: { seconds: 1 },
    })
      .then(() => {
        console.log('Notification scheduled for:', routeName);
      })
      .catch(err => {
        console.log('Notification error:', err);
      });
  };

  const addRoute = () => {
    if (!name || !stop) {
      Alert.alert('Error', 'Please provide both route name and stop');
      return;
    }
    fetch('http://your-ec2-public-ip:3010/addRoute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, stop }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          scheduleNotification(name);
          Alert.alert('Success', 'Route added successfully');
          navigation.navigate('Home');
        } else {
          Alert.alert('Error', data.theError?.message || 'Failed to add route');
        }
      })
      .catch(err => {
        Alert.alert('Error', 'Error adding route: ' + err.message);
      });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Add a New Route</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Route Name (e.g., Bus 101)"
      />
      <TextInput
        style={styles.input}
        value={stop}
        onChangeText={setStop}
        placeholder="Stop Name (e.g., Main St)"
      />
      <Button title="Add Route" onPress={addRoute} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  routeItem: {
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  routeText: {
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginVertical: 10,
    backgroundColor: '#fff',
  },
  detailText: {
    fontSize: 18,
    marginVertical: 5,
  },
});