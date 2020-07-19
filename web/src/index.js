import React from 'react';
import ReactDOM from 'react-dom';
import {
  ApolloClient,
  ApolloProvider,
  createHttpLink,
  InMemoryCache
} from '@apollo/client';
import { setContext } from 'apollo-link-context';

// import global styles
import GlobalStyle from './components/GlobalStyle';

import * as serviceWorker from './serviceWorker';

// import our routes
import Pages from './pages';
import { ESTA_LOGEADO } from './gql/query';

// configure our API URI & cache
const uri = process.env.API_URI;
const httpLink = createHttpLink({ uri });
const cache = new InMemoryCache();

// return the headers to the context
const authLink = setContext((_, { headers }) => {
  return {
    headers: {
      ...headers,
      authorization: localStorage.getItem('token') || ''
    }
  };
});

// create the Apollo client
const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache,
  resolvers: {},
  connectToDevTools: true
});


const data ={
    isLoggedIn: !!localStorage.getItem('token')
};

client.writeQuery({query:ESTA_LOGEADO,data});

// write the cache data after cache is reset
client.onResetStore(() => client.writeQuery({ query: ESTA_LOGEADO, data } ));

const App = () => {
  return (
    <ApolloProvider client={client}>
      <GlobalStyle />
      <Pages />
    </ApolloProvider>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));

serviceWorker.unregister();