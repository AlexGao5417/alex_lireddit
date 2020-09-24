import { Resolver, Query, Ctx, Arg, Int, Mutation } from "type-graphql";
import { Post } from '../entities/Post';
import { MyContext } from '../types';
import { idText } from 'typescript';

@Resolver()
export class PostResolver {
    @Query(() => [Post])
    posts(@Ctx() { em }: MyContext): Promise<Post[]>{
        return em.find(Post, {})  
    }

    // return a Post or null
    @Query(() => Post, {nullable: true})
    post(
        //the name "id" can be changed to any value, and the query will only
        //look for post.id
        @Arg("id", () => Int) id: number, 
        @Ctx() { em }: MyContext
        // return Promise<Post> or return null.
        ): Promise<Post| null>{
            return em.findOne(Post, { id });
        }

    
    @Mutation(() => Post)
    async createPost(
        @Arg("title") title: string,
        @Ctx() { em }: MyContext
    ): Promise<Post | null> {
        const post = em.create(Post, {title});
        await em.persistAndFlush(post);
        return post;
    }

    @Mutation(() => Post, {nullable:true})
    async updatePost(
        @Arg("id") id: number,
        @Arg("title", ()=> String, {nullable:true}) title: string,
        @Ctx() { em }: MyContext
    ): Promise<Post | null> {
        // has to add await, otherwise the type of post would be "Promise"
        // so we could not use "post.title". After added await, the type
        // will change to "Post | null"
        const post = await em.findOne(Post, { id });
        if(!post){
            return null
        }
        if(typeof title != 'undefined') {
            post.title = title;
            await em.persistAndFlush(post);
        }
        return post;
    }

    @Mutation(() => Boolean)
    async deletePost(
        @Arg("id") id: number,
        @Ctx() { em }: MyContext
    ): Promise<Boolean> {
        await em.nativeDelete(Post, {id});
        return true;
    }
}

