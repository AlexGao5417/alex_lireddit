import 'reflect-metadata';
import { MikroORM } from "@mikro-orm/core";
import { __prod__ } from "./constants";
import { Post } from "./entities/Post";
import microConfig from "./mikro-orm.config";
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from "type-graphql";
import { HelloResolver } from './resolvers/hello'
import { PostResolver } from './resolvers/post';
import { UserResolver } from './resolvers/user';
import redis from 'redis';
import session from 'express-session';
import connectRedis from 'connect-redis';
import { MyContext } from './types';

 


const main = async () => {
  const orm = await MikroORM.init(microConfig);
  await orm.getMigrator().up();

  const app = express();

  let RedisStore = connectRedis(session)
  let redisClient = redis.createClient()
  
  
  // to do the cookie test, need to set {"request.credentials": "include"} in graphql's setting.
  app.use(
    session({
      name:'cookieId',
      store: new RedisStore({ 
        client: redisClient,
        disableTouch: true
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
        httpOnly: true,
        sameSite: 'lax',
        secure: false
      },
      // if it is true, the server will create a session even though 
      // no user login
      saveUninitialized: false,
      secret: 'random words',
      resave: false,
    })
  )

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false
    }),
    context: ({ req, res }): MyContext => ({ em: orm.em, req, res })
  });

  apolloServer.applyMiddleware({ app })

  app.get('/', (_,res) => {
    res.send('hi')
  })
  app.listen(4000, () => {
    console.log("server listening in 4000");
    
  })
};

main().catch((err) => {
  console.error(err);
});
