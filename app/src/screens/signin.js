import React from 'react';
import { View, Button, Text } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useMutation, gql } from '@apollo/client';

import UserForm from '../components/UserForm';
import Loading from '../components/Loading';

const SIGNIN_USER = gql`
  mutation signIn($email: String, $password: String!) {
    signIn(email: $email, password: $password)
  }
`;

//Para hacer el login usamos una mutación. Hemos definido arriba la query. Cuando llamemos al hook, en este caso con el método signIn, le pasaremos dos variables, email y password. Podemos también controlar el caso de error, y que hacer mientras graphql no nos responda
const SignIn = props => {
  const [signIn, { loading, error }] = useMutation(SIGNIN_USER, {
    onCompleted: data => {
      //Guardamos el token que hemos recibido de GraphQl en el SecureStore, y navegamos a la App
      SecureStore.setItemAsync('token', data.signIn).then(
        props.navigation.navigate('App')
      );
    }
  });

  // if loading, return a loading indicator
  if (loading) return <Loading />;
  return (
    <React.Fragment>
      {error && <Text>Error signing in!</Text>}
      <UserForm
        action={signIn}
        formType="signIn"
        navigation={props.navigation}
      />
    </React.Fragment>
  );
};

SignIn.navigationOptions = {
  title: 'Sign In'
};

export default SignIn;
