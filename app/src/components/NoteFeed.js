import React from 'react';
import { FlatList, View, TouchableOpacity, Text } from 'react-native';
import styled from 'styled-components/native';

import NoteComponent from './Note';

// FeedView styled-component definition
const FeedView = styled.View`
  height: 100;
  overflow: hidden;
  margin-bottom: 10px;
`;

const Separator = styled.View`
  height: 1;
  width: 100%;
  background-color: #ced0ce;
`;

/*
Usamos una FlatList para mostrar los datos. La flatlist tiene tres propiedades:
- data: los datos
- keyEstractor: el key para identificar a cada item
- podemos definir un separador para cada item
- especificamos que se va a pintar; usamos una lambda para extraer de los datos lo que realmente nos interesa. En este caso cada item se muestra en un TouchableOpacity, de modo que será sensible al tacto; Especificamos hacia donde hay que navegar con cada item; Pasmos cada item a un control llamado NoteComponent
*/
const NoteFeed = props => {
  return (
    <View>
      <FlatList
        data={props.notes}
        keyExtractor={item => item.id.toString()}
        ItemSeparatorComponent={() => <Separator />}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              props.navigation.navigate('Note', {
                id: item.id
              })
            }
          >
            <FeedView>
              <NoteComponent note={item} />
            </FeedView>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

export default NoteFeed;
