import React from 'react';
import Screens from './screens';

// import the Apollo libraries
import {
  ApolloClient,
  ApolloProvider,
  createHttpLink,
  InMemoryCache
} from '@apollo/client';

import { setContext } from 'apollo-link-context';

// import SecureStore for retrieving the token value
import * as SecureStore from 'expo-secure-store';

// import environment configuration
import getEnvVars from '../config';
const { API_URI } = getEnvVars();

// vamos a construir una cache en memoria con el cliente
const uri = API_URI;
const cache = new InMemoryCache();
const httpLink = createHttpLink({ uri });

// Construye el contexto
const authLink = setContext(async (_, { headers }) => {
  return {
    headers: {
      //Mantiene las cabeceras que ya existan
      ...headers,
      //Obtiene la cabecera authorization del SecureStore de Expo
      authorization: (await SecureStore.getItemAsync('token')) || ''
    }
  };
});

// especifica con el cliente la uri del servidor, y el contexto
const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache
});

const Main = () => {
  //Aloja la aplicación dentro de un wrapper de Apollo
  return (
    <ApolloProvider client={client}>
      <Screens />
    </ApolloProvider>
  );
};

export default Main;
