export interface Post {
    id: string;
    title: string;
    content: string;
    createdAt: Date;
    authorId: string;
}
  
export interface CreatePostDTO {
    title: string;
    content: string;
}