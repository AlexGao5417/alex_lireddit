import { MyContext } from "src/types";
import { Resolver, Mutation, Arg, InputType, Field, Ctx, ObjectType } from "type-graphql";
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
    //Mutation means change some data in database, return a User type
    @Mutation(() => UserResponse)
    async register(
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() {em}: MyContext
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
        return { user };
    } 

    //login 
    @Mutation(() => UserResponse)
    async login(
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() {em}: MyContext
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
        // it has to be { user } otherwise it is not a type of UserResponse
        return { user } ;
    } 
}