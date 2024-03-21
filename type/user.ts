export interface UserType {
    id: number;
    token: string;
    name: string;
    age: number;
    phone: string;
    gender: "남자" | "여자";
    feedIds: number[] | null;
    school?: string;
    schoolLocation?: string;
    friends: SimpleUserType[] | null;
}

//다른 객체의 하위로 들어갈 때 사용
export interface SimpleUserType {
    id: number;
    token: string;
    name: string;
    age: number;
    phone: string;
    gender: "남자" | "여자";
    feedIds: number[] | null;
    school?: string;
    schoolLocation?: string;
}