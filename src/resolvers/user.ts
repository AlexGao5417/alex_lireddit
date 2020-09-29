import { MyContext } from "src/types";
import { Resolver, Mutation, Arg, InputType, Field, Ctx, ObjectType, Query } from "type-graphql";
import { User } from '../entities/User';
import argon2 from 'argon2';
import { promises } from "fs";

@InputType()
class UsernamePasswordInput {
    @Field()
    username: string
    @Field()
    password: string
}

@ObjectType()
class FieldError {
    @Field()
    field: string;
    @Field()
    message: string;
}

@ObjectType()
class UserResponse{
    @Field(() => [FieldError], {nullable:true})
    // ? indicates that the variable "erros" is optional, it could be undefined.  
    errors?: FieldError[]

    @Field(() => User, {nullable:true})
    user?: User
}

@Resolver()
export class UserResolver {


    @Query(() => User, {nullable: true})
    async me(
        @Ctx() { req, em }: MyContext
    ) {
        //if there is no userId, it means this user is not logged in.
        if(!req.session!.userId){
            return null
        }

        const user = await em.findOne(User, { id: req.session!.userId });
        return user;
    }

    //Mutation means change some data in database, return a User type
    @Mutation(() => UserResponse)
    async register(
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() { em, req }: MyContext
    ):Promise<UserResponse> {
        if (options.username.length <= 2){
            return {
                errors: [{
                    field: "username",
                    message: " length must be greater than 2"
                }]
            }
        }

        if (options.password.length <= 3){
            return {
                errors: [{
                    field: "password",
                    message: " length must be greater than 3"
                }]
            }
        }
        //hash user password
        const hashedPassword = await argon2.hash(options.password);
        
        const user = em.create(User, {
            username: options.username,
            password: hashedPassword,
        })
        try{
            await em.persistAndFlush(user);
        } catch (err) {
           if(err.code === "23505") {
               return {
                   errors:[{
                       field: "username",
                       message: " username already taken"
                   }]
               }
           }
        }

        /**
         * what happened behind the scene is that we are storing data into 'session', and the data
         * in 'session' will be taken out and stock in Redis ({userId: 1} -> send to Redis), and in 
         * Redis the key->value pair for this might be sth like:
         *      sess:Fsafsae -> {userId: 1}
         * And then the 'express-session' middleware will encrypt the key and set it as a cookie on 
         * user's browser;
         * Next time when the user send a request to server, this cookie will be sent as well.
         * 
         * On server, it will decrypt the cookie using the secret key we set, and get the key, then it
         * will look up this key in Redis and get the data {userId: 1}.
         * 
         * Also, we can store any data in session, not only userId, it can be like:
         * req.session!.randomstuff = user;
         */
        req.session!.userId = user.id;


        return { user };
    } 

    //login 
    @Mutation(() => UserResponse)
    async login(
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() { em, req }: MyContext
    ) {
        const user = await em.findOne(User, {
            username: options.username,
        })

        if(!user) return {
            errors: [{
                field: 'username',
                message: 'that username does not exist'
            }]
        }
        const valid = await argon2.verify(user.password, options.password)
        
        if(!valid) return {
            errors: [{
                field: 'password',
                message: 'incorrect password'
            }]
        }

        //req.session object is possibly undefined, so we need add ! to tell typescript this will be defined
        //this is because that the definition of session is session:? Express.Session, and :? means this 
        //element could be possibly undefined
        req.session!.userId = user.id;
        console.log(req.session!.userId);
        
        // it has to be { user } otherwise it is not a type of UserResponse
        return { user } ;
    } 
}