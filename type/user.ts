export interface UserType {
    id: number;
    token: string;
    name: string;
    age: number;
    phone: string;
    gender: "boy" | "girl";
    friendIds: number[];
    feedIds: number[];
    requestFriendIds?: number[];
    school?: string;
    schoolLocation?: string;
}