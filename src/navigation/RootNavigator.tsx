function RootNavigator({ initialRoute }: { initialRoute: undefined }) {
  const { isAuthenticated, isLoading } = useApp();

  if (isLoading) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Waiting" component={WaitingScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      detachInactiveScreens={false}
      initialRouteName={isAuthenticated ? 'Root' : 'SignIn'}
    >
      {/* rest of your screens unchanged */}
    </Stack.Navigator>
  );
}