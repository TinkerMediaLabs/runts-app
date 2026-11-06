// Remembers how the person last signed in on this phone. Sign in with Apple (native) leaves nothing in the token to
// tell it apart from email and password, and the Account screen needs to know so it can offer "Set a Password".
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SIGN_IN_METHOD_KEY = 'runts.signInMethod';

export async function rememberSignInMethod(method: 'apple' | 'email'): Promise<void> {
  try { await AsyncStorage.setItem(SIGN_IN_METHOD_KEY, method); } catch { /* the Account screen falls back to email */ }
}
