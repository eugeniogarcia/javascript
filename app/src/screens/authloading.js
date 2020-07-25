import React, { useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

import Loading from '../components/Loading';

//Este componente comprueba en el SecureStore si hay un token, si lo hay navega a App, sino a Auth. En el switchnavigator se han definido estas dos páginas
const AuthLoading = props => {
  const checkLoginState = async () => {
    // retrieve the value of the token
    const userToken = await SecureStore.getItemAsync('token');
    // navigate to the app screen if a token is present
    // else navigate to the auth screen
    props.navigation.navigate(userToken ? 'App' : 'Auth');
  };

  //Cuando se haya creado el componente, hace una comprobación del estado
  useEffect(() => {
    checkLoginState();
  });

  return <Loading />;
};

export default AuthLoading;
