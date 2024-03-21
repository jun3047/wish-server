import { SimpleUserType } from "./user";

export interface FeedType {
    id: number;
    question: string;
    imgUrl: string;
    time: string;
    warnUserIds: number[];
    
    writer: SimpleUserType;
    asker: SimpleUserType;
}