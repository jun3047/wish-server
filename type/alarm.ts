export interface AlarmType {
    id: number;
    question: string;
    token: string;
    name: string;
    age: number;
    gender: "boy" | "girl";
    school?: string;
    schoolLocation?: string;
    friendIds: string[];
}