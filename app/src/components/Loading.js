import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import styled from 'styled-components/native';

//Define una vista con un estilo
const LoadingWrap = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

//Incluimos un ActivityIndicator dentro de nuestra vista
const Loading = () => {
  return (
    <LoadingWrap>
      <ActivityIndicator size="large" />
    </LoadingWrap>
  );
};

export default Loading;
