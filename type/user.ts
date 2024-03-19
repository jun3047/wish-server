export interface IRequestFriendInfo {
    token: string;
    gender: "boy" | "girl";
    id: number;
    name: string;
    age: number;
    school: string;
    schoolLocation: string;
    friendIds: number[];
}

export interface UserType {
    id: number;
    token: string;
    name: string;
    age: number;
    phone: string;
    gender: "boy" | "girl";
    friendIds: number[];
    feedIds: number[];
    school?: string;
    schoolLocation?: string;
    // requestFriendInfos: ServerUserType[]; (client)
    // addFriendIds: number[]; (client)
}

export interface FeedUserType {
    id: number;
    name: string;
    token: string;
    age: number;
    school?: string;
    schoolLocation?: string;
}
