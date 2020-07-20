# Instalacion

Instalamos graphql y el cliente de apollo:

```ps
npm install -s graphql @apollo/client apollo-link-context
```

Instalamos utilidades de React, como el router:

```ps
npm install -s react-markdown react-router-dom @types/react
```

Otros modulos:

```ps
npm install -s normalize.css styled-components date-fns
```
## Utilidades para el desarrollo

```ps
npm install --save-dev graphql-request prettier test-data-bot
```

# GraphQL

En este ejemplo estamos utilizando functional react. Usaremos hooks para interactuar con GraphQL, con el estado - useState - y el ciclo de presentacion - useEffect.

## Configuracion

Para poder acceder a variables de entorno hemos creado un archivo `.env` en el que hemos incluido la url del servidor de GraphQL:

```txt
REACT_APP_API_URI=http://localhost:4000/api
```

## Cliente Apollo

Para acceder a nuestro servidor de GraphQL usaremos el cliente Apollo. Para configurar el cliente necesitamos los siguientes módulos:

```js
import {
  ApolloClient,
  ApolloProvider,
  createHttpLink,
  InMemoryCache
} from '@apollo/client';
```

Especificamos donde poder encontrar el servidor de GraphQL:

```js
const uri = process.env.REACT_APP_API_URI;
const httpLink = createHttpLink({ uri });
```

El cliente de Apollo se puede configurar con una cache. La cache hará que cuando solicitemos una query, el cliente primero la busque en nuestra cache - local -, y sino está ahí, a) haga la petición al servidor y b) actualice la cache. La cache que vamos a usar es inMemory:

```js
const cache = new InMemoryCache();
```

Podemos especificar un contexto con http headers que se incluirán en cada petición:

```js
// return the headers to the context
const authLink = setContext((_, { headers }) => {
  return {
    headers: {
      ...headers,
      authorization: localStorage.getItem('token') || ''
    }
  };
});
```

Con todo esto ya podemos crear nuestro cliente:

```js
// create the Apollo client
const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache,
  resolvers: {},
  connectToDevTools: true
});
```

Finalmente usaremos el `ApolloProvider` como root de los componentes de react:

```js
const App = () => {
  return (
    <ApolloProvider client={client}>
      <GlobalStyle />
      <Pages />
    </ApolloProvider>
  );
};
```

## Cache

Como hemos indicado antes podemos definir una cache con el cliente de Apollo. Si lo necesitamos podemos poner y quitar elementos de la cache de forma explicita - por ejemplo para inicializarla. En nuestro caso por ejemplo, necesitamos crear un flag que nos indique si hay alguien logeado o no, `isLoggedIn`. Cuando necesitemos saber si hay alguien conectado o no consultaremos este valor.

Para actualizar o leer de la cache hay que ejecutar una query/mutacion de GraphQL, como si de cualquier otra query/mutacion se tratase. Cuando hagamos la operación se consultará/escribirá el valor de la cache. Si queremos que la petición se haga contra la cache pero no se propage al servidor, tendremos que incluir una anotación en el tipo:

```yaml
const ESTA_LOGEADO = gql`
    query estaLogeado {
        isLoggedIn @client
    }
  `;
```

Cuando usemos esta query, recuperaremos o actualizaremos el valor `isLoggedIn` en la cache y no trasladará la petición al servidor. Si queremos escribir en la cache haríamos:

```js
const { data, client } = useQuery(ESTA_LOGEADO);
```

El hook devolvería los datos en `data` y una referencia al cliente de apollo en `client`. Si quisieramos actualizar la cache:

```js
client.writeQuery({query:ESTA_LOGEADO,data});
```

Se pasa un objeto con dos atributos `query` y `data`, en el primero informamos la query, y en el segundo los datos que queremos actualizar.

## Mutations. useMutation

Especificamos en el hook la mutación, y un objeto. En el objeto podemos 

- __refetchQueries__. actualizar la cache
- __onCompleted__. un callback a ejecutar cuando se haya completado el hook

```js
  const [data, { loading, error }] = useMutation(NEW_NOTE, {
    // refetch the GET_NOTES and GET_MY_NOTES queries to update the cache
    refetchQueries: [{ query: GET_MY_NOTES }, { query: GET_NOTES }],
    onCompleted: data => {
      // when complete, redirect the user to the note page
      props.history.push(`note/${data.newNote.id}`);
    }
  });
```

La respuesta del hook:

- __data__. Datos retornados
- __loading__. Flag que indica son los datos estan o no disponobles
- __error__. Error cuando se produzca

La mutación se define como:

´´´js
const NEW_  NOTE = gql`
  mutation newNote($content: String!) {
    newNote(content: $content) {
      id
      content
      createdAt
      favoriteCount
      favoritedBy {
        id
        username
      }
      author {
        username
        id
      }
    }
  }
`;
```

En este caso, una vez hemos creado una nota, refrescamos la cache ejecutando:

```js
const GET_MY_NOTES = gql`
  query me {
    me {
      id
      username
      notes {
        id
        createdAt
        content
        favoriteCount
        author {
          username
          id
          avatar
        }
      }
    }
  }
`;
```

y

```js
const GET_NOTE = gql`
  query note($id: ID!) {
    note(id: $id) {
      id
      createdAt
      content
      favoriteCount
      author {
        username
        id
        avatar
      }
    }
  }
`;
```

El efecto neto es que cuando creamos una nueva nota, actualizamos la cache con todas las notas, y con las notas del usuario logeado. En este otro hook usamos el hook __useApolloClient__ para tener acceso al cliente Apollo, por ejemplo para escribir en le cache:

```js
const client = useApolloClient();
const [signUp, { loading, error }] = useMutation(SIGNUP_USER, {
  onCompleted: data => {
    // store the token
    localStorage.setItem('token', data.signUp);
    // update the local cache
    client.writeQuery({ query: ESTA_LOGEADO, data: { isLoggedIn: true } });
    // redirect the user to the homepage
    props.history.push('/');
  }
});
```

## Queries. useQuery

Para hacer una query usamos el hook useQuery:

```js
// query hook, passing the id value as a variable
const { loading, error, data } = useQuery(GET_NOTE, { variables: { id } });
```

En este caso estamos, además de especificar la query, indicando los datos de entrada. En GET_NOTE se indica cual es el id de la nota. En la respuesta tenemos una referencia a los datos retornados del servidor, sino también acceso a los errores y al indicador que nos dice si los datos se han recuperado ya:

```js
// if the data is loading, display a loading message
if (loading) return <p>Loading...</p>;
// if there is an error fetching the data, display an error message
if (error) return <p>Error! Note not found</p>;
```

Las respuestas del hook son:

- __loading__. Indica si los datos se han recuperado ya o no
- __data__. Datos
- __error__. Información del error en caso de error
- __fetchMore__. Método que nos permite recuperar más datos


```js
const { data, loading, error, fetchMore } = useQuery(GET_NOTES);
// if the data is loading, display a loading message
if (loading) return <p>Loading...</p>;
// if there is an error fetching the data, display an error message
if (error) return <p>Error!</p>;
```

Y podemos recuperar más datos como sigue:

```js
fetchMore({
  variables: {
    cursor: data.noteFeed.cursor
  },
  updateQuery: (previousResult, { fetchMoreResult }) => {
    return {
      noteFeed: {
        cursor: fetchMoreResult.noteFeed.cursor,
        hasNextPage: fetchMoreResult.noteFeed.hasNextPage,
        // combine the new results and the old
        notes: [
          ...previousResult.noteFeed.notes,
          ...fetchMoreResult.noteFeed.notes
        ],
        __typename: 'noteFeed'
      }
    };
  }
})
}
```

