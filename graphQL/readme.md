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