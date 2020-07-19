# Instalación

Creamos la app de Express:

```ps
express api
```

Instalamos el apollo server para node. Apollo server implementa un servidor de GraphQL:

```ps
npm install apollo-server-express
```

Instalamos graphql y una librerías que definen reglas en graphql:

- Definir reglas de complejidad. Esto evita que hagamos queries demasiado complejas
- Definir reglas de limite. Esto evita que podamos anidar demasiados niveles de queries
- Gestion de fechas

```ps
npm install graphql
npm install graphql-validation-complexity graphql-depth-limit graphql-iso-date
```

Instalamos el cliente para Mongo

```ps
npm install mongoose
```

Utilidad para poder definir variables de entorno en un archivo de configuración `.env`:

```ps
npm install dotenv
```

Utilidades para gestionar web token, encriptar, calcular md5:

```ps
npm install jsonwebtoken md5 passport bcrypt passport-github2
```

Utilidades para gestionar cors, sesiones, y con helmet aplicamos algunas prácticas estandar de seguridad añadiendo cabeceras estandard a las peticiones:

```ps
npm install express-session helmet cors marked nodemon 
```

Finalmente utilidades para el desarrollo:

```ps
npm install eslint eslint-config-prettier eslint-plugin-prettier prettier faker node-fetch --save-dev
```

# GraphQL

## Tipos

Definimos los tipos que vamos a utilizar en `schema.js`

```js
const { gql } = require('apollo-server-express');

module.exports = gql`
  scalar DateTime

  type Note {
    id: ID!
    content: String!
    author: User!
    favoriteCount: Int!
    favoritedBy: [User]
    createdAt: DateTime!
    updatedAt: DateTime!
  }

...
```

Definimos tipos, que vamos a utilizar en queries y mutaciones. Las queries sirven para consultar datos. La mutaciones para actualizarlos - insetar o actualizar. Las queries y mutaciones contendran la definición de todos los métodos que queremos exponer con GraphQL. Se definen como dos tipos "más":

```yaml
  type Query {
    notes: [Note!]!
    note(id: ID): Note!
    user(username: String!): User
    users: [User!]!
    me: User!
    noteFeed(cursor: String): NoteFeed
  }

  type Mutation {
    newNote(content: String!): Note
    updateNote(id: ID!, content: String!): Note!
    deleteNote(id: ID!): Boolean!
    toggleFavorite(id: ID!): Note!
    signUp(username: String!, email: String!, password: String!): String!
    signIn(username: String, email: String, password: String!): String!
  }
```

Tenemos seis queries definidas, algunas toman argumentos, y devuelven un tipo. Tenemos también seis mutaciones definidas, que también pueden tomar uno o varios argumentos. Las mutaciones también pueden devolver datos de un determinado tipo.

Los tipos estándard incluidos con GraphQL son los que siguen. Estos tipos se denominan `scalars`:

- ID
- String
- Int
- Float
- Boolean
- un array. Se denota con `[]`
- un campo obligatorio se denota con una `!`

Con estos tipos estándard podemos definir tipos custom que podrán usarse en queries y mutaciones:

```yaml
  scalar DateTime

  type Note {
    id: ID!
    content: String!
    author: User!
    favoriteCount: Int!
    favoritedBy: [User]
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type User {
    id: ID!
    username: String!
    email: String!
    avatar: String
    notes: [Note!]!
    favorites: [Note!]!
  }

  type NoteFeed {
    notes: [Note]!
    cursor: String!
    hasNextPage: Boolean!
  }
```

Notese que en este ejemplo hemos definido tambieb un __tipo scalar custom__, DateTipe. Este tipo lo tendremos que definir tambien.

## Resolvers

Los resolver se encargan de definir como cada query o mutacion es implementada. Por convenio a) hemos creado una carpeta para guardar todos los resolvers, b) creado un modulo para definir los resolvers de queries, otro para las mutaciones, 

### Queries

```js
module.exports = {
  notes: async (parent, args, { models }) => {
    return await models.Note.find().limit(100);
  },
  note: async (parent, args, { models }) => {
    return await models.Note.findById(args.id);
  },
  user: async (parent, args, { models }) => {
    return await models.User.findOne({ username: args.username });
  },
  users: async (parent, args, { models }) => {
    return await models.User.find({}).limit(100);
  },
  me: async (parent, args, { models, user }) => {
    return await models.User.findById(user.id);
  },
  noteFeed: async (parent, { cursor }, { models }) => {
    // hard code the limit to 10 items
    const limit = 10;
    // set the default hasNextPage value to false
    let hasNextPage = false;
    // if no cursor is passed the default query will be empty
    // this will pull the newest notes from the db
    let cursorQuery = {};

    // if there is a cursor
    // our query will look for notes with an ObjectId less than that of the cursor
    if (cursor) {
      cursorQuery = { _id: { $lt: cursor } };
    }

    // find the limit + 1 of notes in our db, sorted newest to oldest
    let notes = await models.Note.find(cursorQuery)
      .sort({ _id: -1 })
      .limit(limit + 1);

    // if the number of notes we find exceeds our limit
    // set hasNextPage to true & trim the notes to the limit
    if (notes.length > limit) {
      hasNextPage = true;
      notes = notes.slice(0, -1);
    }

    // the new cursor will be the Mongo ObjectID of the last item in the feed array
    const newCursor = notes[notes.length - 1]._id;

    return {
      notes,
      cursor: newCursor,
      hasNextPage
    };
  }
};
```

Los resolver son asíncronos:

```js
  notes: async (parent, args, { models }) => {
    return await models.Note.find().limit(100);
  },
```

Tienen cuatro argumentos:
- El padre. Este es el resultado de la query padre. Utilizado en casos de queries anidadas
- Los argumentos del resolver
- El contexto
- Info. Información acerca de la query

Como en cualquier funcion, los resolvers usan los argumentos de forma dinámica. Esto es, si no necesitamos el contexto o info en nuestro resolver, no tendremos porque especificar estos dos argumentos.

Con el contexto pasamos un cross-cutting concern a todos los resolvers. El padre nos permitira acceder a la información de la query padre. En el caso de queries anidadas sería la que esta haciendo referencia al resolver.

### Mutations

Similar al caso de las queries, los mutations los implementamos definiendo para cada uno una funcion. La funcion puede tener los cuatro argumentos que hemos comentado en las queries.  

Importamos modulos que vamos a utilizar para encriptar y gestionar los json web tokens:

```js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
```

Modulos incluidos con Apollo que definen errores estandard. En este caso el de autenticación, y el error de acceso no permitido:

```js
const {
  AuthenticationError,
  ForbiddenError
} = require('apollo-server-express');
```

Usaremos mongoose, y sacaremos de un archivo `.env` los parametros de configuración:

```js
const mongoose = require('mongoose');
require('dotenv').config();
```

La implementación de todos los métodos del mutation. Nótese como en el contexto esperamos que este definido el objeto que nos permite usar mongo, asi como las credenciales del usuario.

```js
module.exports = {
  newNote: async (parent, args, { models, user }) => {
    if (!user) {
      throw new AuthenticationError('You must be signed in to create a note');
    }

    return await models.Note.create({
      content: args.content,
      author: mongoose.Types.ObjectId(user.id),
      favoriteCount: 0
    });
  },
```

En el siguiente método usaremos también argumentos, en concreto, el id:

```js
deleteNote: async (parent, { id }, { models, user }) => {
  // if not a user, throw an Authentication Error
  if (!user) {
    throw new AuthenticationError('You must be signed in to delete a note');
  }

  // find the note
  const note = await models.Note.findById(id);
  // if the note owner and current user don't match, throw a forbidden error
  if (note && String(note.author) !== user.id) {
    throw new ForbiddenError("You don't have permissions to delete the note");
  }

  try {
    // if everything checks out, remove the note
    await note.remove();
    return true;
  } catch (err) {
    // if there's an error along the way, return false
    return false;
  }
},
```

Podemos usar varios argumentos, como se demuestra aquí:

```js
signUp: async (parent, { username, email, password }, { models }) => {
```

### Queries anidadas

Para definir queries anidades vamos a crear algun resolver más en `user.js` y en `note.js`:

```js
module.exports = {
  // Resolve the author info for a note when requested
  author: async (note, args, { models }) => {
    return await models.User.findById(note.author);
  },
  // Resolved the favoritedBy info for a note when requested
  favoritedBy: async (note, args, { models }) => {
    return await models.User.find({ _id: { $in: note.favoritedBy } });
  }
};
```

Aqui estamos definiendo dos resolvers más que vamos a poder utilizar cuando estemos haciendo queries sobre `note`. Notese que el primer argumento hace referencia a note. Este es el parent, y hace referencia a los datos obtenidos en una consulta padre:

```js
// Resolve the author info for a note when requested
author: async (note, args, { models }) => {
  return await models.User.findById(note.author);
},
```

### Modulo que aglutina todos los resolvers

Para no tener que ir importando cada resolver por separado, usamos el siguiente modulo que contiene los distintos módulos con los resolvers:

```js
const Query = require('./query');
const Mutation = require('./mutation');
const Note = require('./note');
const User = require('./user');
const { GraphQLDateTime } = require('graphql-iso-date');

module.exports = {
  Query,
  Mutation,
  Note,
  User,
  DateTime: GraphQLDateTime
};
```

Estamos haciendo referencia a los resolvers de `Query` y `Mutation`, los resolvers donde hemos incluido resolvers para queries anidadas, `Note` y `User`. También estamos definiendo el escalar custom `DateTime` que importamos del módulo `graphql-iso-date`.

## Apollo Server

¿Como convinamos todo esto para exponer una API GraphQL?. Con Apollo Server tenemos varias opciones, una de ellas para poder utilizarlo con Node.

Lo que haremos es crear un servidor de Apollo, especificando los tipos de GraphQL, los resolvers, y opcionalmente el contexto - cuando queramos definir uno. En primer lugar referenciamos al modulo de Apollo Server:

```js
const { ApolloServer } = require('apollo-server-express');
```

Creamos una instanacia. Especificamos los tipos y los resolvers:

```js
const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [depthLimit(5), createComplexityLimitRule(1000)],
  context: async ({ req }) => {
    // get the user token from the headers
    const token = req.headers.authorization;
    // try to retrieve a user with the token
    const user = getUser(token);
    // add the db models and the user to the context
    return { models, user };
  }
});
```

Opcionalmente podemos definir reglas y el contexto. Las reglas en nuestro caso aseguran que las queries que ejecutamos no sean complejas, y que no se puedan anidar más de cinco queries:

```js
validationRules: [depthLimit(5), createComplexityLimitRule(1000)],
```

El contexto lo creamos con dos objetos. El que nos permite acceder a los modelos definidos en Mongo, y el que contiene los datos del usuario logeado:

```js
const models = require('./models');
```

```js
context: async ({ req }) => {
    // get the user token from the headers
    const token = req.headers.authorization;
    // try to retrieve a user with the token
    const user = getUser(token);
    // add the db models and the user to the context
    return { models, user };
  }
```

# Express

En este ejemplo estamos utilizando middlewares con Express que son interesantes en cualquier contexto en el que expongamos con node apis:

```js
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();
```

```js
var app = express();

// Security middleware
app.use(helmet());
// CORS middleware
app.use(cors());
```

Con `helmet` se inyectan cabeceras en las peticiones que mejoran la seguridad del servidor.

# Mongo

## Esquema y Modelos 

Creamos una carpeta llamada `models` para guardar los esquemas que hemos definido en Mongo - mongo no define un esquema, lo aplicaremos en la aplicación. De cara a facilitar la referencia desde otros modulos, todos los esquemas los definimos en un modulo, en `models\index.js`

```js
const Note = require('./note');
const User = require('./user');

const models = {
  Note,
  User
};

module.exports = models;
```

Usamos _mongoose_ para definir los esquemas.

### Esquema

Para definir un esquema, creamos un esquema de mongoose con `<Esquema> = new mongoose.Schema({...})`, y a continuación creamos con el el modelo, usando `mongoose.model(<Nombre>, <Esquema>);`.

Importamos el módulo de mongoose:

```js
// Require the mongose library
const mongoose = require('mongoose');
```

Definimos el esquema. Veamos primero el modelo para las `Notes`:

```js
// Define the note's database schema
const noteSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true
    },
    // reference the author's object ID
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    favoriteCount: {
      type: Number,
      default: 0
    },
    favoritedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ]
  },
  {
    // Assigns createdAt and updatedAt fields with a Date type
    timestamps: true
  }
);
```

Aquí hemos visto:

- definir varios campos en el esquema
- especificar el tipo de campo
- indicar un valor por defecto - de forma opcional
- hacer referencia al tipo especial ID, con `mongoose.Schema.Types.ObjectId`. Con este tipo podemos además especificar una referencia, de modo que indicamos el ID a que modelo esta referenciando. En nuestro caso, al modelo User - que definiremos también
- indicar si el campo es obligatorio o no
- indicar si queremos que se añadan los campos de auditoria a nuestro modelo - `timestamps: true`
- Hemos definido una colección/array con `[]`

### Modelo

Una vez hemos definido el esquema, creamos el modelo y lo exportamos:

```js
// Define the 'Note' model with the schema
const Note = mongoose.model('Note', noteSchema);
// Export the module
module.exports = Note;
```

El modelo para los usuarios se define de la misma forma. En este modelo vamos a definir algún índice:

```js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      index: { unique: true }
    },
    email: {
      type: String,
      required: true,
      index: { unique: true }
    },
    password: {
      type: String,
      required: true
    },
    avatar: {
      type: String
    }
  },
  {
    // Assigns createdAt and updatedAt fields with a Date type
    timestamps: true
  }
);
```

En este modelo estamos indicando que ciertos campos esten indexados, de forma que podamos buscar por ellos de forma más eficiente.

Y finalmente definimos el modelo. Notese que este modelo se referencio en el modelo Notes:

```js
const User = mongoose.model('User', UserSchema);
module.exports = User;
```

## Conexion

Creamos un modulo con todas las utilidades para conectarse y desconectarse de Mongo:

```js
// Require the mongose library
const mongoose = require('mongoose');

module.exports = {
  connect: (DB_HOST, TEST_DB) => {
    // Use the Mongo driver's updated URL string parser
    mongoose.set('useNewUrlParser', true);
    // Use `findOneAndUpdate()` in place of findAndModify()
    mongoose.set('useFindAndModify', false);
    // Use `createIndex()` in place of `ensureIndex()`
    mongoose.set('useCreateIndex', true);
    // Use the new server discovery & monitoring engine
    mongoose.set('useUnifiedTopology', true);
    // Connect to the DB
    mongoose.connect(DB_HOST + "/" + TEST_DB);
    // Log an error if we fail to connect
    mongoose.connection.on('error', err => {
      console.error(err);
      console.log(
        'MongoDB connection error. Please make sure MongoDB is running.'
      );
      process.exit();
    });
  },

  close: () => {
    mongoose.connection.close();
  }
};
```

## Queries

### Consulta

Podemos hacer un scan y recuperar todos los documentos, o un número máximo de documentos:

```js
await models.Note.find().limit(100);
```

Podemos buscar un documento con su id:

```js
await models.Note.findById(args.id);
```

Podemos buscar por cualquier otro campo del documento. Por ejemplo, por `username`:

```js
return await models.User.findOne({ username: args.username });
```

Podemos implementar una páginación:

```js
cursorQuery = { _id: { $lt: cursor } };
let notes = await models.Note.find(cursorQuery)
    .sort({ _id: -1 })
    .limit(limit + 1);
```

### Inserts

Crea un documento:

```js
await models.Note.create({
    content: args.content,
    author: mongoose.Types.ObjectId(user.id),
    favoriteCount: 0
});
```

### Deletes

Borra todos los documentos:

```js
await note.remove();
```

### Updates

Actualiza un documento. Lo busca y actualiza alguno de sus propiedades
```js
await models.Note.findOneAndUpdate(
    {
        _id: id
    },
    {
    $set: {
        content
    }
    },
    {
        new: true
    }
);
```

En esta variante lo que hacemos es buscar el objeto, y eliminar una entrada de un campo array:

```js
await models.Note.findByIdAndUpdate(
id,
{
    $pull: {
    favoritedBy: mongoose.Types.ObjectId(user.id)
    },
    $inc: {
    favoriteCount: -1
    }
},
{
    // Set new to true to return the updated doc
    new: true
});
```

En esta variante lo que hacemos es buscar el objeto, y añadir una entrada de un campo array:

```js
await models.Note.findByIdAndUpdate(
id,
{
    $push: {
    favoritedBy: mongoose.Types.ObjectId(user.id)
    },
    $inc: {
    favoriteCount: 1
    }
},
{
    new: true
});
```

# Ejemplos

## Mutations

```yaml
mutation{
  signUp(username:"egsmartin",
    email: "egsmartin@gmail.com"
    ,password: "vera1511")
}
```

```yaml
mutation{
  signIn(username:"egzach",
    email: "egzach.com"
    ,password: "vera1511")
}
```

En este otro ejemplo tenemos que pasar también una cabecera:

```yaml
mutation{
  newNote(content:"Tarea 1"){
    id
    content
    author{
      username
    }
    favoriteCount
  }
}
```

y la cabecera:

```yaml
{
  "Authorization" : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVmMTQzNjc0ZjM5MzQ0MjcxNGMzOGIxZCIsImlhdCI6MTU5NTE2MDIyNH0.zBLCZ9KfM3CwcyWIU3N0jg1wzOskrUzqMJafCwffWyQ"
}
```

## Queries

```yaml
query{
  me{
    id
    username
    email
  }
}
```

