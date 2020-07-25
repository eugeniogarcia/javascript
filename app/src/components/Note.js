import React from 'react';
import { Text, ScrollView } from 'react-native';
import styled from 'styled-components/native';
import Markdown from 'react-native-markdown-renderer';
import { format, parseISO } from 'date-fns';

const NoteView = styled.ScrollView`
  padding: 10px;
`;

//Visualiza los datos de cada nota
const NoteComponent = ({ note }) => {
  return (
    <NoteView>
      <Text>
        Note by {note.author.username} / Published{' '}
        {format(parseISO(note.createdAt), 'MMM Do yyyy')}
      </Text>
      <Markdown>{note.content}</Markdown>
    </NoteView>
  );
};

export default NoteComponent;
